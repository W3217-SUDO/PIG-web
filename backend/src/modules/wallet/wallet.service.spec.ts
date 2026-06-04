import { describe, expect, it, jest } from '@jest/globals';
import { WalletService } from './wallet.service';
import { TxDirection, TxType } from './wallet-transaction.entity';

describe('WalletService', () => {
  function createService(existingWallet?: any) {
    const wallet = existingWallet ?? {
      id: 'wallet_1',
      userId: 'user_1',
      balance: '0.00',
      frozen: '0.00',
    };
    const walletRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(existingWallet ?? null),
      create: jest.fn((input: any) => ({ id: 'wallet_new', ...input })),
      save: jest.fn(async (input: any) => ({ ...input, id: input.id ?? 'wallet_saved' })),
    };
    const txRepo = {
      find: (jest.fn() as any).mockResolvedValue([{ id: 'tx_1' }]),
      findAndCount: (jest.fn() as any).mockResolvedValue([[{ id: 'tx_2' }], 1]),
      create: jest.fn((input: any) => ({ id: 'tx_new', ...input })),
      save: jest.fn(async (input: any) => input),
    };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'Wallet') return walletRepo;
        return txRepo;
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };
    const service = new WalletService(walletRepo as any, txRepo as any, dataSource as any);
    return { service, wallet, walletRepo, txRepo, dataSource };
  }

  it('creates a wallet on first access', async () => {
    const { service, walletRepo } = createService();

    const wallet = await service.ensureWallet('user_1');

    expect(walletRepo.create).toHaveBeenCalledWith({
      userId: 'user_1',
      balance: '0.00',
      frozen: '0.00',
    });
    expect(walletRepo.save).toHaveBeenCalled();
    expect(wallet.userId).toBe('user_1');
  });

  it('reuses an existing wallet and lists recent transactions', async () => {
    const { service, txRepo } = createService({
      id: 'wallet_existing',
      userId: 'user_1',
      balance: '12.30',
      frozen: '0.00',
    });

    const overview = await service.getOverview('user_1');

    expect(overview.wallet.id).toBe('wallet_existing');
    expect(txRepo.find).toHaveBeenCalledWith({
      where: { walletId: 'wallet_existing' },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    expect(overview.recent).toEqual([{ id: 'tx_1' }]);
  });

  it('lists transactions with pagination and optional direction filter', async () => {
    const { service, txRepo } = createService({
      id: 'wallet_existing',
      userId: 'user_1',
      balance: '12.30',
      frozen: '0.00',
    });

    const page = await service.listTransactions('user_1', 2, 5, TxDirection.IN);

    expect(txRepo.findAndCount).toHaveBeenCalledWith({
      where: { walletId: 'wallet_existing', direction: TxDirection.IN },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
    expect(page).toEqual({ items: [{ id: 'tx_2' }], total: 1, page: 2, pageSize: 5 });
  });

  it('credits balance and writes an incoming transaction inside a transaction', async () => {
    const { service, walletRepo, txRepo, dataSource } = createService({
      id: 'wallet_existing',
      userId: 'user_1',
      balance: '12.30',
      frozen: '0.00',
    });

    const tx = await service.credit('user_1', 7.2, TxType.TOPUP, 'mock topup', 'rel_1');

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(walletRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ balance: '19.50' }),
    );
    expect(txRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet_existing',
        userId: 'user_1',
        direction: TxDirection.IN,
        type: TxType.TOPUP,
        amount: '7.20',
        balanceAfter: '19.50',
        relatedId: 'rel_1',
        note: 'mock topup',
      }),
    );
    expect(tx.balanceAfter).toBe('19.50');
  });

  it('debits balance and rejects insufficient balance', async () => {
    const { service, walletRepo, txRepo } = createService({
      id: 'wallet_existing',
      userId: 'user_1',
      balance: '20.00',
      frozen: '0.00',
    });

    const tx = await service.debit('user_1', 8.5, TxType.ORDER_PAY, 'order pay', 'order_1');

    expect(walletRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ balance: '11.50' }),
    );
    expect(txRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: TxDirection.OUT,
        type: TxType.ORDER_PAY,
        amount: '8.50',
        balanceAfter: '11.50',
      }),
    );
    expect(tx.balanceAfter).toBe('11.50');

    const poor = createService({
      id: 'wallet_existing',
      userId: 'user_1',
      balance: '1.00',
      frozen: '0.00',
    });
    await expect(poor.service.debit('user_1', 8.5, TxType.ORDER_PAY)).rejects.toThrow();
  });
});
