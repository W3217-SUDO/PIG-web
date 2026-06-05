import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Order, OrderStatus } from '../order/order.entity';
import { PayService } from './pay.service';

describe('PayService', () => {
  const OLD_ENV = process.env;
  const userId = 'user_1';
  const orderId = 'order_1';

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.WX_PAY_MCH_ID;
    delete process.env.WX_PAY_API_KEY;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  function makeOrder(overrides: Partial<Order> = {}) {
    return {
      id: orderId,
      userId,
      status: OrderStatus.PENDING,
      totalPrice: '88.00',
      ...overrides,
    } as Order;
  }

  function createService(overrides: Record<string, any> = {}) {
    const orderRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(overrides.order ?? makeOrder()),
      ...overrides.orderRepo,
    };
    const paymentRepo = {
      findOne: jest.fn(),
      ...overrides.paymentRepo,
    };
    const orders = {
      mockPay: jest.fn(),
      ...overrides.orders,
    };

    return {
      service: new PayService(orderRepo as any, paymentRepo as any, orders as any),
      orderRepo,
      paymentRepo,
      orders,
    };
  }

  it('rejects wx prepay when WeChat Pay is not configured', async () => {
    const { service } = createService();

    await expect(service.wxPrepay(userId, orderId)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not create wx prepay for another user order', async () => {
    const { service } = createService({ order: makeOrder({ userId: 'other_user' }) });

    await expect(service.wxPrepay(userId, orderId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
