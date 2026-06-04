import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { Order, OrderPayMethod, OrderStatus } from './order.entity';
import { OrderService } from './order.service';
import { OrderPayment, PaymentChannel, PaymentStatus } from './order-payment.entity';
import { Pig, PigStatus } from '../pig/pig.entity';
import { MessageType } from '../message/message.entity';
import { TxType } from '../wallet/wallet-transaction.entity';

describe('OrderService', () => {
  const userId = 'user_1';
  const orderId = 'order_12345678';

  function makePig(overrides: Partial<Pig> = {}) {
    return {
      id: 'pig_1',
      title: 'Launch Pig',
      status: PigStatus.LISTED,
      pricePerShare: '88.00',
      totalShares: 10,
      soldShares: 2,
      ...overrides,
    } as Pig;
  }

  function makeOrder(overrides: Partial<Order> = {}) {
    return {
      id: orderId,
      userId,
      pigId: 'pig_1',
      sharesCount: 2,
      unitPrice: '88.00',
      totalPrice: '176.00',
      status: OrderStatus.PENDING,
      payMethod: null,
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      slaughterDate: null,
      refundedAt: null,
      refundReason: '',
      trackingNo: '',
      addressSnapshot: null,
      remark: '',
      ...overrides,
    } as Order;
  }

  function createService(overrides: Record<string, any> = {}) {
    const order = overrides.order ?? makeOrder();
    const pig = overrides.pig ?? makePig();
    const payment = { id: 'payment_1', orderId } as OrderPayment;
    const address = {
      id: 'addr_1',
      userId,
      name: 'Alice',
      phone: '13800138000',
      province: 'Sichuan',
      city: 'Chengdu',
      district: 'Wuhou',
      detail: 'No.1 Yard',
    };

    const orderRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(order),
      findAndCount: (jest.fn() as any).mockResolvedValue([[order], 1]),
      create: jest.fn((input: any) => ({ id: orderId, ...input })),
      save: jest.fn(async (input: any) => input),
      ...overrides.orderRepo,
    };
    const pigRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(pig),
      find: (jest.fn() as any).mockResolvedValue([pig]),
      save: jest.fn(async (input: any) => input),
      ...overrides.pigRepo,
    };
    const paymentRepo = {
      find: (jest.fn() as any).mockResolvedValue([payment]),
      create: jest.fn((input: any) => ({ id: 'payment_new', ...input })),
      save: jest.fn(async (input: any) => input),
      ...overrides.paymentRepo,
    };
    const addressRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(address),
      ...overrides.addressRepo,
    };

    const txOrderRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(order),
      save: jest.fn(async (input: any) => input),
      ...overrides.txOrderRepo,
    };
    const txPigRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(pig),
      save: jest.fn(async (input: any) => input),
      ...overrides.txPigRepo,
    };
    const txPaymentRepo = {
      create: jest.fn((input: any) => ({ id: 'payment_tx', ...input })),
      save: jest.fn(async (input: any) => input),
      ...overrides.txPaymentRepo,
    };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity === Order) return txOrderRepo;
        if (entity === Pig) return txPigRepo;
        return txPaymentRepo;
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
      ...overrides.dataSource,
    };
    const messages = {
      notify: jest.fn(async () => ({ id: 'msg_1' })),
      ...overrides.messages,
    };
    const wallet = {
      ensureWallet: (jest.fn() as any).mockResolvedValue({ id: 'wallet_1', balance: '999.00' }),
      debit: (jest.fn() as any).mockResolvedValue({ id: 'wallet_tx_1' }),
      credit: (jest.fn() as any).mockResolvedValue({ id: 'wallet_refund_1' }),
      ...overrides.wallet,
    };

    const service = new OrderService(
      orderRepo as any,
      pigRepo as any,
      paymentRepo as any,
      addressRepo as any,
      dataSource as any,
      messages as any,
      wallet as any,
    );

    return {
      service,
      order,
      pig,
      orderRepo,
      pigRepo,
      paymentRepo,
      addressRepo,
      dataSource,
      messages,
      wallet,
      txOrderRepo,
      txPigRepo,
      txPaymentRepo,
    };
  }

  it('creates a pending order with address snapshot and calculated total', async () => {
    const { service, orderRepo, addressRepo } = createService();

    const order = await service.create(userId, {
      pigId: 'pig_1',
      sharesCount: 2,
      addressId: 'addr_1',
      remark: 'leave note',
    });

    expect(addressRepo.findOne).toHaveBeenCalledWith({ where: { id: 'addr_1', userId } });
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        pigId: 'pig_1',
        sharesCount: 2,
        unitPrice: '88.00',
        totalPrice: '176.00',
        status: OrderStatus.PENDING,
        addressSnapshot: {
          name: 'Alice',
          phone: '13800138000',
          region: 'SichuanChengduWuhou',
          detail: 'No.1 Yard',
        },
      }),
    );
    expect(order.totalPrice).toBe('176.00');
  });

  it('rejects creating orders for missing, unavailable, or oversold pigs', async () => {
    await expect(
      createService({ pigRepo: { findOne: (jest.fn() as any).mockResolvedValue(null) } }).service.create(userId, {
        pigId: 'missing',
        sharesCount: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      createService({ pig: makePig({ status: PigStatus.SOLD_OUT }) }).service.create(userId, {
        pigId: 'pig_1',
        sharesCount: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      createService({ pig: makePig({ soldShares: 9, totalShares: 10 }) }).service.create(userId, {
        pigId: 'pig_1',
        sharesCount: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists current user orders with pig summaries', async () => {
    const { service, orderRepo, pigRepo } = createService();

    const page = await service.listMyOrders(userId, 2, 5, OrderStatus.PAID);

    expect(orderRepo.findAndCount).toHaveBeenCalledWith({
      where: { userId, status: OrderStatus.PAID },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
    expect(pigRepo.find).toHaveBeenCalled();
    expect(page.items[0].pig?.id).toBe('pig_1');
  });

  it('returns order detail with pig and payment history', async () => {
    const { service, pigRepo, paymentRepo } = createService();

    const detail = await service.getOrder(userId, orderId);

    expect(pigRepo.findOne).toHaveBeenCalledWith({ where: { id: 'pig_1' } });
    expect(paymentRepo.find).toHaveBeenCalledWith({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    expect(detail.payments).toHaveLength(1);

    await expect(
      createService({ order: makeOrder({ userId: 'other_user' }) }).service.getOrder(userId, orderId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancels only pending orders and sends a notification', async () => {
    const { service, orderRepo, messages } = createService();

    const order = await service.cancel(userId, orderId);

    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.CANCELLED }));
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_CANCELLED, relatedId: orderId }),
    );

    await expect(
      createService({ order: makeOrder({ status: OrderStatus.PAID }) }).service.cancel(userId, orderId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pays by wallet, books payment, increments shares, and notifies the user', async () => {
    const pig = makePig({ soldShares: 8, totalShares: 10 });
    const { service, wallet, dataSource, txOrderRepo, txPigRepo, txPaymentRepo, messages } = createService({ pig });

    const result = await service.payByWallet(userId, orderId);

    expect(wallet.ensureWallet).toHaveBeenCalledWith(userId);
    expect(wallet.debit).toHaveBeenCalledWith(
      userId,
      176,
      TxType.ORDER_PAY,
      expect.any(String),
      orderId,
    );
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(txOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.PAID, payMethod: OrderPayMethod.WALLET }),
    );
    expect(txPigRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ soldShares: 10, status: PigStatus.SOLD_OUT }),
    );
    expect(txPaymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: PaymentChannel.WALLET,
        transactionId: 'wallet_wallet_tx_1',
        amount: '176.00',
        status: PaymentStatus.SUCCESS,
      }),
    );
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_PAID, relatedId: orderId }),
    );
    expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
  });

  it('rejects wallet payment when balance is insufficient', async () => {
    const { service, wallet, dataSource } = createService({
      wallet: {
        ensureWallet: (jest.fn() as any).mockResolvedValue({ id: 'wallet_1', balance: '10.00' }),
      },
    });

    await expect(service.payByWallet(userId, orderId)).rejects.toBeInstanceOf(BadRequestException);
    expect(wallet.debit).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('refunds wallet debit when business payment transaction fails', async () => {
    const { service, wallet } = createService({
      dataSource: {
        transaction: jest.fn(async () => {
          throw new BadRequestException('sold out during payment');
        }),
      },
    });

    await expect(service.payByWallet(userId, orderId)).rejects.toBeInstanceOf(BadRequestException);
    expect(wallet.credit).toHaveBeenCalledWith(
      userId,
      176,
      TxType.REFUND,
      expect.any(String),
      orderId,
    );
  });

  it('moves paid orders into refund pending with a trimmed reason', async () => {
    const { service, orderRepo, messages } = createService({
      order: makeOrder({ status: OrderStatus.PAID }),
    });

    const order = await service.requestRefund(userId, orderId, '  changed plan  ');

    expect(order.status).toBe(OrderStatus.REFUND_PENDING);
    expect(order.refundReason).toBe('changed plan');
    expect(orderRepo.save).toHaveBeenCalledWith(order);
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_REFUND_PENDING, relatedId: orderId }),
    );

    await expect(service.requestRefund(userId, orderId, 'x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms receipt only from shipped state', async () => {
    const { service, orderRepo, messages } = createService({
      order: makeOrder({ status: OrderStatus.SHIPPED }),
    });

    const order = await service.confirmReceived(userId, orderId);

    expect(order.status).toBe(OrderStatus.DELIVERED);
    expect(order.deliveredAt).toBeInstanceOf(Date);
    expect(orderRepo.save).toHaveBeenCalledWith(order);
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_DELIVERED, relatedId: orderId }),
    );

    await expect(createService().service.confirmReceived(userId, orderId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks paid orders shipped with tracking and slaughter date', async () => {
    const slaughterDate = new Date('2026-01-20T00:00:00Z');
    const { service, orderRepo, messages } = createService({
      order: makeOrder({ status: OrderStatus.PAID }),
    });

    const order = await service.markShipped(orderId, {
      trackingNo: 'TRACK123',
      slaughterDate,
    });

    expect(order.status).toBe(OrderStatus.SHIPPED);
    expect(order.trackingNo).toBe('TRACK123');
    expect(order.slaughterDate).toBe(slaughterDate);
    expect(orderRepo.save).toHaveBeenCalledWith(order);
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_SHIPPED, relatedId: orderId }),
    );
  });

  it('approves refund, credits wallet, releases shares, and notifies the user', async () => {
    const pig = makePig({ soldShares: 10, totalShares: 10, status: PigStatus.SOLD_OUT });
    const { service, wallet, txOrderRepo, txPigRepo, messages } = createService({
      order: makeOrder({ status: OrderStatus.REFUND_PENDING }),
      pig,
    });

    const order = await service.approveRefund(orderId);

    expect(wallet.credit).toHaveBeenCalledWith(userId, 176, TxType.REFUND, expect.any(String), orderId);
    expect(txPigRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ soldShares: 8, status: PigStatus.LISTED }),
    );
    expect(txOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.REFUNDED, refundedAt: expect.any(Date) }),
    );
    expect(messages.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.ORDER_REFUNDED, relatedId: orderId }),
    );
    expect(order.status).toBe(OrderStatus.REFUNDED);
  });

  it('blocks mock pay in production unless dev login is enabled', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldDevLogin = process.env.DEV_LOGIN_ENABLED;
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_LOGIN_ENABLED;

    try {
      await expect(createService().service.mockPay(userId, orderId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldDevLogin === undefined) delete process.env.DEV_LOGIN_ENABLED;
      else process.env.DEV_LOGIN_ENABLED = oldDevLogin;
    }
  });
});
