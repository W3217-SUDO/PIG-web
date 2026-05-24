import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/order.entity';
import { OrderPayment } from '../order/order-payment.entity';
import { OrderService } from '../order/order.service';

@Injectable()
export class PayService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    private readonly orders: OrderService,
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

  async wxNotify() {
    throw new ServiceUnavailableException('微信支付暂未配置');
  }
}
