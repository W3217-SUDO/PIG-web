import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import {
  OrderPayment,
  PaymentChannel,
  PaymentStatus,
} from './order-payment.entity';
import { Pig, PigStatus } from '../pig/pig.entity';

export interface CreateOrderInput {
  pigId: string;
  sharesCount: number;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建订单(状态 pending);不预占份额,支付成功时再 +sold_shares
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
    const unitPrice = pig.pricePerShare;
    const total = (parseFloat(unitPrice) * input.sharesCount).toFixed(2);

    const order = this.orderRepo.create({
      userId,
      pigId: input.pigId,
      sharesCount: input.sharesCount,
      unitPrice,
      totalPrice: total,
      status: OrderStatus.PENDING,
    });
    return this.orderRepo.save(order);
  }

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
    return { ...o, pig };
  }

  async cancel(userId: string, orderId: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('订单不存在');
    if (o.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`订单状态 ${o.status} 不可取消`);
    }
    o.status = OrderStatus.CANCELLED;
    return this.orderRepo.save(o);
  }

  /**
   * 开发用 mock 支付:NODE_ENV !== production 才走
   * 事务:order.status=paid + pig.sold_shares += + order_payment 落账
   * v1 mock 不真扣钱包,只走业务状态;v1.5 接微信支付后再加钱包流水
   */
  async mockPay(userId: string, orderId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('mock-paid 仅开发环境可用');
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

      return { order: o, payment };
    });
  }
}
