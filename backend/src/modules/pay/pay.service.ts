import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MessageType } from '../message/message.entity';
import { MessageService } from '../message/message.service';
import { Order, OrderPayMethod, OrderStatus } from '../order/order.entity';
import { OrderPayment, PaymentChannel, PaymentStatus } from '../order/order-payment.entity';
import { OrderService } from '../order/order.service';
import { Pig, PigStatus } from '../pig/pig.entity';
import { User } from '../user/user.entity';
import { WECHAT_PAY_CLIENT_FACTORY } from './pay.module';
import { WechatPayClient } from './wechat-pay.client';

@Injectable()
export class PayService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
    private readonly dataSource: DataSource,
    private readonly messages: MessageService,
    private readonly orders: OrderService,
    @Inject(WECHAT_PAY_CLIENT_FACTORY)
    private readonly wxClientFactory: () => WechatPayClient | null,
  ) {}

  async getOrderPayStatus(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    const latestPayment = await this.paymentRepo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    return { order, latestPayment };
  }

  async mockPrepay(userId: string, orderId: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const devEnabled = process.env.DEV_LOGIN_ENABLED === 'true';
    if (isProd && !devEnabled) {
      throw new ForbiddenException('mock 支付仅开发环境可用');
    }
    return this.orders.mockPay(userId, orderId);
  }

  async wxPrepay(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`订单状态 ${order.status} 不可支付`);
    }

    const client = this.wxClientFactory();
    if (!client) {
      throw new ServiceUnavailableException('微信支付暂未配置');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.openid) {
      throw new BadRequestException('用户 openid 缺失,请重新登录');
    }

    const prepay = await client.createJsapiPrepay({
      description: `私人订猪认养-${order.id.slice(-8)}`,
      outTradeNo: order.id,
      amountTotal: this.yuanToFen(order.totalPrice),
      openid: user.openid,
      attach: JSON.stringify({ orderId: order.id, userId }),
    });

    const payment = this.paymentRepo.create({
      orderId: order.id,
      channel: PaymentChannel.WXPAY,
      prepayId: prepay.prepayId,
      transactionId: null,
      amount: order.totalPrice,
      status: PaymentStatus.PENDING,
      rawPayload: { prepayAt: new Date().toISOString() },
      succeededAt: null,
    });
    await this.paymentRepo.save(payment);

    return {
      orderId: order.id,
      prepayId: prepay.prepayId,
      payParams: prepay.payParams,
    };
  }

  async wxNotify(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    const client = this.wxClientFactory();
    if (!client) {
      throw new ServiceUnavailableException('微信支付暂未配置');
    }

    const timestamp = this.header(headers, 'wechatpay-timestamp');
    const nonce = this.header(headers, 'wechatpay-nonce');
    const signature = this.header(headers, 'wechatpay-signature');
    if (!timestamp || !nonce || !signature) {
      throw new UnauthorizedException('微信支付回调 header 缺失');
    }
    if (!client.verifyNotificationSignature({ timestamp, nonce, body: rawBody, signature })) {
      throw new UnauthorizedException('微信支付回调签名失败');
    }

    const notification = JSON.parse(rawBody);
    const resource = client.decryptNotification(notification);
    if (resource.trade_state !== 'SUCCESS') {
      return { code: 'SUCCESS', message: 'OK' };
    }

    await this.markWxPaymentSuccess(resource, notification);
    return { code: 'SUCCESS', message: 'OK' };
  }

  private async markWxPaymentSuccess(resource: Record<string, any>, notification: Record<string, any>) {
    const orderId = resource.out_trade_no as string;
    const transactionId = resource.transaction_id as string;
    if (!orderId || !transactionId) {
      throw new BadRequestException('微信支付回调缺少订单或交易号');
    }

    const alreadyPaid = await this.paymentRepo.findOne({ where: { transactionId } });
    if (alreadyPaid?.status === PaymentStatus.SUCCESS) return;

    const result = await this.dataSource.transaction(async (m) => {
      const oRepo = m.getRepository(Order);
      const pRepo = m.getRepository(Pig);
      const payRepo = m.getRepository(OrderPayment);

      const order = await oRepo.findOne({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status === OrderStatus.PAID) return { order, pigTitle: '' };
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(`订单状态 ${order.status} 不可支付`);
      }

      const pig = await pRepo.findOne({ where: { id: order.pigId } });
      if (!pig) throw new NotFoundException('猪不存在');
      if (pig.soldShares + order.sharesCount > pig.totalShares) {
        throw new BadRequestException('期间份额被占用,请运营人工处理');
      }

      order.status = OrderStatus.PAID;
      order.payMethod = OrderPayMethod.WXPAY;
      order.wxPayTransactionId = transactionId;
      order.paidAt = resource.success_time ? new Date(resource.success_time) : new Date();
      await oRepo.save(order);

      pig.soldShares += order.sharesCount;
      if (pig.soldShares >= pig.totalShares) pig.status = PigStatus.SOLD_OUT;
      await pRepo.save(pig);

      const payment = payRepo.create({
        orderId: order.id,
        channel: PaymentChannel.WXPAY,
        prepayId: '',
        transactionId,
        amount: ((Number(resource.amount?.total || 0) || this.yuanToFen(order.totalPrice)) / 100).toFixed(2),
        status: PaymentStatus.SUCCESS,
        rawPayload: { notification, resource },
        succeededAt: order.paidAt,
      });
      await payRepo.save(payment);

      return { order, pigTitle: pig.title };
    });

    if (result?.order) {
      await this.messages.notify({
        userId: result.order.userId,
        type: MessageType.ORDER_PAID,
        title: `认养支付成功:${result.pigTitle || result.order.id.slice(-8)}`,
        content: `订单已支付 ¥${result.order.totalPrice},我们将开始代养服务。`,
        relatedId: result.order.id,
      });
    }
  }

  private yuanToFen(value: string) {
    return Math.round(Number(value) * 100);
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
