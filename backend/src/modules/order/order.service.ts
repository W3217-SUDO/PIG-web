import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderPayMethod, OrderStatus } from './order.entity';
import {
  OrderPayment,
  PaymentChannel,
  PaymentStatus,
} from './order-payment.entity';
import { Pig, PigStatus } from '../pig/pig.entity';
import { MessageService } from '../message/message.service';
import { MessageType } from '../message/message.entity';
import { WalletService } from '../wallet/wallet.service';
import { TxType } from '../wallet/wallet-transaction.entity';
import { Address } from '../address/address.entity';

export interface CreateOrderInput {
  pigId: string;
  sharesCount: number;
  addressId?: string;
  remark?: string;
}

export interface MarkShippedInput {
  trackingNo?: string;
  slaughterDate?: Date;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly dataSource: DataSource,
    private readonly messages: MessageService,
    private readonly wallet: WalletService,
  ) {}

  // ===================== 创建 =====================

  /**
   * 创建订单(状态 pending);不预占份额,支付成功时再 +sold_shares
   * 如果带 addressId,会把地址 snapshot 拷贝进 order
   */
  async create(userId: string, input: CreateOrderInput): Promise<Order> {
    const pig = await this.pigRepo.findOne({ where: { id: input.pigId } });
    if (!pig) throw new NotFoundException('猪不存在');
    if (pig.status !== PigStatus.LISTED) {
      throw new BadRequestException('该猪当前不可认领');
    }
    if (pig.soldShares + input.sharesCount > pig.totalShares) {
      throw new BadRequestException(
        `份额不足: 剩 ${pig.totalShares - pig.soldShares} 份`,
      );
    }

    let addressSnapshot: Order['addressSnapshot'] = null;
    if (input.addressId) {
      const addr = await this.addressRepo.findOne({
        where: { id: input.addressId, userId },
      });
      if (!addr) throw new BadRequestException('收货地址不存在');
      addressSnapshot = {
        name: addr.name,
        phone: addr.phone,
        region: `${addr.province}${addr.city}${addr.district}`,
        detail: addr.detail,
      };
    }

    const unitPrice = pig.pricePerShare;
    const total = (parseFloat(unitPrice) * input.sharesCount).toFixed(2);

    const order = this.orderRepo.create({
      userId,
      pigId: input.pigId,
      sharesCount: input.sharesCount,
      unitPrice,
      totalPrice: total,
      status: OrderStatus.PENDING,
      addressSnapshot,
      remark: input.remark || '',
    });
    return this.orderRepo.save(order);
  }

  // ===================== 查询 =====================

  async listMyOrders(
    userId: string,
    page = 1,
    pageSize = 20,
    status?: OrderStatus,
  ) {
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const pigIds = Array.from(new Set(orders.map((o) => o.pigId)));
    const pigs = pigIds.length
      ? await this.pigRepo.find({ where: { id: In(pigIds) } })
      : [];
    const pigMap = new Map(pigs.map((p) => [p.id, p]));
    const items = orders.map((o) => ({
      ...o,
      pig: pigMap.get(o.pigId) || null,
    }));
    return { items, total, page, pageSize };
  }

  async getOrder(userId: string, orderId: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.userId !== userId) throw new NotFoundException('订单不存在');
    const pig = await this.pigRepo.findOne({ where: { id: o.pigId } });
    const payments = await this.paymentRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    return { ...o, pig, payments };
  }

  // ===================== 状态流转 =====================

  /**
   * 取消订单(仅 pending 可取消)
   */
  async cancel(userId: string, orderId: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('订单不存在');
    if (o.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`订单状态 ${o.status} 不可取消`);
    }
    o.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(o);
    await this.messages.notify({
      userId,
      type: MessageType.ORDER_CANCELLED,
      title: '订单已取消',
      content: `订单 ${orderId.slice(-8)} 已取消`,
      relatedId: orderId,
    });
    return o;
  }

  /**
   * 钱包余额支付
   * 事务: 扣钱包 → 写支付流水 → order=paid + pig.sold_shares 增 + 钱包流水
   */
  async payByWallet(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`订单状态 ${order.status} 不可支付`);
    }
    const amount = parseFloat(order.totalPrice);

    // 预检余额(给个友好提示,真实扣款仍在事务里再校验一次)
    const w = await this.wallet.ensureWallet(userId);
    if (parseFloat(w.balance) < amount) {
      throw new BadRequestException(
        `钱包余额不足: 当前 ¥${w.balance},需要 ¥${order.totalPrice}`,
      );
    }

    // 1) 扣钱包(独立事务,余额不足会抛 Error)
    let walletTxId = '';
    try {
      const tx = await this.wallet.debit(
        userId,
        amount,
        TxType.ORDER_PAY,
        `订单 ${orderId.slice(-8)} 钱包支付`,
        orderId,
      );
      walletTxId = tx.id;
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    // 2) 业务事务: order=paid + pig.sold_shares + + payment 落账
    const result = await this.dataSource.transaction(async (m) => {
      const oRepo = m.getRepository(Order);
      const pRepo = m.getRepository(Pig);
      const payRepo = m.getRepository(OrderPayment);

      const o = await oRepo.findOne({ where: { id: orderId } });
      if (!o) throw new NotFoundException('订单不存在');
      const pig = await pRepo.findOne({ where: { id: o.pigId } });
      if (!pig) throw new NotFoundException('猪不存在');
      if (pig.soldShares + o.sharesCount > pig.totalShares) {
        // 异常:刚扣的钱要退回(下面 catch 处理)
        throw new BadRequestException('期间份额被抢光,请取消下单重选');
      }

      o.status = OrderStatus.PAID;
      o.payMethod = OrderPayMethod.WALLET;
      o.paidAt = new Date();
      await oRepo.save(o);

      pig.soldShares += o.sharesCount;
      if (pig.soldShares >= pig.totalShares) {
        pig.status = PigStatus.SOLD_OUT;
      }
      await pRepo.save(pig);

      const payment = payRepo.create({
        orderId: o.id,
        channel: PaymentChannel.WALLET,
        prepayId: '',
        transactionId: `wallet_${walletTxId}`,
        amount: o.totalPrice,
        status: PaymentStatus.SUCCESS,
        rawPayload: { walletTxId, at: new Date().toISOString() },
        succeededAt: new Date(),
      });
      await payRepo.save(payment);

      return { order: o, payment, pigTitle: pig.title };
    }).catch(async (err) => {
      // 业务事务失败,把钱包扣的钱退回去
      await this.wallet
        .credit(
          userId,
          amount,
          TxType.REFUND,
          `订单 ${orderId.slice(-8)} 钱包支付失败回滚`,
          orderId,
        )
        .catch(() => null);
      throw err;
    });

    await this.messages.notify({
      userId,
      type: MessageType.ORDER_PAID,
      title: `🎉 认领成功:${result.pigTitle}`,
      content: `订单已支付 ¥${result.order.totalPrice}(钱包余额)`,
      relatedId: result.order.id,
    });

    return { order: result.order, payment: result.payment };
  }

  /**
   * 用户发起退款(仅 PAID 状态下、未发货前可退)
   * v1 简化:直接进 REFUND_PENDING,运营审核后再走 approveRefund
   */
  async requestRefund(userId: string, orderId: string, reason: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('订单不存在');
    if (o.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `订单状态 ${o.status} 不可申请退款(只有已支付未发货可退)`,
      );
    }
    if (!reason || reason.trim().length < 2) {
      throw new BadRequestException('请填写退款原因(≥2 字)');
    }

    o.status = OrderStatus.REFUND_PENDING;
    o.refundReason = reason.trim().slice(0, 256);
    await this.orderRepo.save(o);

    await this.messages.notify({
      userId,
      type: MessageType.ORDER_REFUND_PENDING,
      title: '退款申请已提交',
      content: `订单 ${orderId.slice(-8)} 退款审核中,1-3 个工作日内处理`,
      relatedId: orderId,
    });
    return o;
  }

  /**
   * 用户确认收货(SHIPPED → DELIVERED)
   */
  async confirmReceived(userId: string, orderId: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('订单不存在');
    if (o.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException(`订单状态 ${o.status} 不可确认收货`);
    }
    o.status = OrderStatus.DELIVERED;
    o.deliveredAt = new Date();
    await this.orderRepo.save(o);

    await this.messages.notify({
      userId,
      type: MessageType.ORDER_DELIVERED,
      title: '🐖 已确认收货',
      content: `订单 ${orderId.slice(-8)} 已确认收货,感谢支持私人订猪。`,
      relatedId: orderId,
    });
    return o;
  }

  // ===================== 管理端操作(暂不开放公网) =====================

  /**
   * 标记发货(PAID → SHIPPED) — 管理员/系统操作
   * 当前 v1 通过 SQL 或运营脚本调用,暂不放公网路由
   */
  async markShipped(orderId: string, input: MarkShippedInput) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== OrderStatus.PAID) {
      throw new BadRequestException(`订单状态 ${o.status} 不可发货`);
    }
    o.status = OrderStatus.SHIPPED;
    o.shippedAt = new Date();
    o.slaughterDate = input.slaughterDate ?? new Date();
    o.trackingNo = (input.trackingNo || '').slice(0, 64);
    await this.orderRepo.save(o);

    await this.messages.notify({
      userId: o.userId,
      type: MessageType.ORDER_SHIPPED,
      title: '🥩 您的土猪已发货',
      content: o.trackingNo
        ? `屠宰日 ${o.slaughterDate.toISOString().slice(0, 10)},物流单号 ${o.trackingNo}`
        : `屠宰日 ${o.slaughterDate.toISOString().slice(0, 10)},冷链直送`,
      relatedId: orderId,
    });
    return o;
  }

  /**
   * 管理员批准退款(REFUND_PENDING → REFUNDED) — 把钱退回钱包
   * v1 通过 SQL 或运营脚本调用
   */
  async approveRefund(orderId: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== OrderStatus.REFUND_PENDING) {
      throw new BadRequestException(`订单状态 ${o.status} 不可审核退款`);
    }
    const amount = parseFloat(o.totalPrice);

    // 1) 退款入钱包
    await this.wallet.credit(
      o.userId,
      amount,
      TxType.REFUND,
      `订单 ${orderId.slice(-8)} 退款`,
      orderId,
    );

    // 2) 释放份额(soldShares -=)
    await this.dataSource.transaction(async (m) => {
      const oRepo = m.getRepository(Order);
      const pRepo = m.getRepository(Pig);
      const pig = await pRepo.findOne({ where: { id: o.pigId } });
      if (pig) {
        pig.soldShares = Math.max(0, pig.soldShares - o.sharesCount);
        if (pig.status === PigStatus.SOLD_OUT && pig.soldShares < pig.totalShares) {
          pig.status = PigStatus.LISTED;
        }
        await pRepo.save(pig);
      }
      o.status = OrderStatus.REFUNDED;
      o.refundedAt = new Date();
      await oRepo.save(o);
    });

    await this.messages.notify({
      userId: o.userId,
      type: MessageType.ORDER_REFUNDED,
      title: '💰 退款已到账',
      content: `订单 ${orderId.slice(-8)} 已退款 ¥${o.totalPrice} 至钱包余额`,
      relatedId: orderId,
    });
    return o;
  }

  // ===================== 开发用 mock 支付 =====================

  /**
   * 开发用 mock 支付:NODE_ENV !== production 才走
   */
  async mockPay(userId: string, orderId: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const devEnabled = process.env.DEV_LOGIN_ENABLED === 'true';
    if (isProd && !devEnabled) {
      throw new ForbiddenException('mock-paid 仅开发环境可用');
    }
    return this.dataSource.transaction(async (m) => {
      const oRepo = m.getRepository(Order);
      const pRepo = m.getRepository(Pig);
      const payRepo = m.getRepository(OrderPayment);

      const o = await oRepo.findOne({ where: { id: orderId } });
      if (!o || o.userId !== userId) throw new NotFoundException('订单不存在');
      if (o.status !== OrderStatus.PENDING) {
        throw new BadRequestException(`订单状态 ${o.status} 不可支付`);
      }
      const pig = await pRepo.findOne({ where: { id: o.pigId } });
      if (!pig) throw new NotFoundException('猪不存在');
      if (pig.soldShares + o.sharesCount > pig.totalShares) {
        throw new BadRequestException('期间份额被抢光,请取消下单重选');
      }

      o.status = OrderStatus.PAID;
      o.payMethod = OrderPayMethod.MOCK;
      o.paidAt = new Date();
      await oRepo.save(o);

      pig.soldShares += o.sharesCount;
      if (pig.soldShares >= pig.totalShares) {
        pig.status = PigStatus.SOLD_OUT;
      }
      await pRepo.save(pig);

      const payment = payRepo.create({
        orderId: o.id,
        channel: PaymentChannel.MOCK,
        prepayId: '',
        transactionId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        amount: o.totalPrice,
        status: PaymentStatus.SUCCESS,
        rawPayload: { mock: true, at: new Date().toISOString() },
        succeededAt: new Date(),
      });
      await payRepo.save(payment);

      return { order: o, payment, pigTitle: pig.title };
    }).then(async (r) => {
      await this.messages.notify({
        userId,
        type: MessageType.ORDER_PAID,
        title: `🎉 认领成功:${r.pigTitle}`,
        content: `订单已支付 ¥${r.order.totalPrice}, 这头猪从今天起就是你的了。`,
        relatedId: r.order.id,
      });
      return { order: r.order, payment: r.payment };
    });
  }
}
