import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Order, OrderPayMethod, OrderStatus } from '../order/order.entity';
import { PaymentChannel, PaymentStatus } from '../order/order-payment.entity';
import { MessageType } from '../message/message.entity';
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
      create: jest.fn((value) => value),
      save: jest.fn((value: any) => Promise.resolve({ id: 'payment_1', ...value })),
      ...overrides.paymentRepo,
    };
    const userRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(
        overrides.user ?? { id: userId, openid: 'openid_1', nickname: '用户' },
      ),
      ...overrides.userRepo,
    };
    const pigRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(
        overrides.pig ?? { id: 'pig_1', title: '土猪', soldShares: 0, totalShares: 10 },
      ),
      ...overrides.pigRepo,
    };
    const dataSource = {
      transaction: jest.fn((fn: any) =>
        fn({
          getRepository: (entity: any) => {
            if (entity.name === 'Order') {
              return { findOne: orderRepo.findOne, save: jest.fn((value) => Promise.resolve(value)) };
            }
            if (entity.name === 'Pig') {
              return { findOne: pigRepo.findOne, save: jest.fn((value) => Promise.resolve(value)) };
            }
            return {
              findOne: paymentRepo.findOne,
              create: paymentRepo.create,
              save: paymentRepo.save,
            };
          },
        }),
      ),
      ...overrides.dataSource,
    };
    const messages = {
      notify: jest.fn(),
      ...overrides.messages,
    };
    const orders = {
      mockPay: jest.fn(),
      ...overrides.orders,
    };
    const wxClientFactory = jest.fn(() => {
      if (!overrides.wxClient) return null;
      return (
        overrides.wxClient ?? {
          getConfig: () => ({ appid: 'wx_appid' }),
          createJsapiPrepay: (jest.fn() as any).mockResolvedValue({
            prepayId: 'wx_prepay_1',
            payParams: {
              appId: 'wx_appid',
              timeStamp: '1700000000',
              nonceStr: 'nonce',
              package: 'prepay_id=wx_prepay_1',
              signType: 'RSA',
              paySign: 'signature',
            },
          }),
          verifyNotificationSignature: jest.fn().mockReturnValue(true),
          decryptNotification: jest.fn().mockReturnValue({
            out_trade_no: orderId,
            transaction_id: 'wx_tx_1',
            trade_state: 'SUCCESS',
            success_time: '2026-06-05T09:00:00+08:00',
            amount: { total: 8800 },
          }),
        }
      );
    });

    return {
      service: new PayService(
        orderRepo as any,
        paymentRepo as any,
        userRepo as any,
        pigRepo as any,
        dataSource as any,
        messages as any,
        orders as any,
        wxClientFactory as any,
      ),
      orderRepo,
      paymentRepo,
      userRepo,
      pigRepo,
      dataSource,
      messages,
      orders,
      wxClientFactory,
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

  it('creates wx jsapi prepay params and records a pending payment', async () => {
    process.env.WX_PAY_MCH_ID = '1655786861';
    process.env.WX_PAY_API_V3_KEY = '12345678901234567890123456789012';
    const wxClient = {
      getConfig: () => ({ appid: 'wx_appid' }),
      createJsapiPrepay: (jest.fn() as any).mockResolvedValue({
        prepayId: 'wx_prepay_1',
        payParams: {
          appId: 'wx_appid',
          timeStamp: '1700000000',
          nonceStr: 'nonce',
          package: 'prepay_id=wx_prepay_1',
          signType: 'RSA',
          paySign: 'signature',
        },
      }),
    };
    const { service, paymentRepo } = createService({ wxClient });

    const result = await service.wxPrepay(userId, orderId);

    expect(wxClient.createJsapiPrepay).toHaveBeenCalledWith(
      expect.objectContaining({
        outTradeNo: orderId,
        amountTotal: 8800,
        openid: 'openid_1',
      }),
    );
    expect(paymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        channel: PaymentChannel.WXPAY,
        prepayId: 'wx_prepay_1',
        status: PaymentStatus.PENDING,
      }),
    );
    expect(result.payParams.package).toBe('prepay_id=wx_prepay_1');
  });

  it('rejects wx prepay when order is not pending', async () => {
    const { service } = createService({ order: makeOrder({ status: OrderStatus.PAID }) });

    await expect(service.wxPrepay(userId, orderId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks order paid after verified wx notify and stays idempotent', async () => {
    const order = makeOrder({ pigId: 'pig_1', sharesCount: 2, status: OrderStatus.PENDING });
    const wxClient = {
      getConfig: () => ({ appid: 'wx_appid' }),
      createJsapiPrepay: jest.fn(),
      verifyNotificationSignature: jest.fn().mockReturnValue(true),
      decryptNotification: jest.fn().mockReturnValue({
        out_trade_no: orderId,
        transaction_id: 'wx_tx_1',
        trade_state: 'SUCCESS',
        success_time: '2026-06-05T09:00:00+08:00',
        amount: { total: 8800 },
      }),
    };
    const { service, paymentRepo, messages } = createService({
      order,
      wxClient,
      paymentRepo: {
        findOne: (jest.fn() as any).mockResolvedValueOnce(null),
      },
    });

    const result = await service.wxNotify(
      JSON.stringify({ resource: { ciphertext: 'encrypted', nonce: 'nonce' } }),
      {
        'wechatpay-timestamp': '1700000000',
        'wechatpay-nonce': 'nonce',
        'wechatpay-signature': 'signature',
      },
    );

    expect(result).toEqual({ code: 'SUCCESS', message: 'OK' });
    expect(paymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        channel: PaymentChannel.WXPAY,
        transactionId: 'wx_tx_1',
        status: PaymentStatus.SUCCESS,
      }),
    );
    expect(order.status).toBe(OrderStatus.PAID);
    expect(order.payMethod).toBe(OrderPayMethod.WXPAY);
    expect(order.wxPayTransactionId).toBe('wx_tx_1');
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_PAID, relatedId: orderId }),
    );
  });
});
