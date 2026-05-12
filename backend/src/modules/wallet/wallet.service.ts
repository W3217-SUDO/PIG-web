import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import {
  TxDirection,
  TxType,
  WalletTransaction,
} from './wallet-transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /** 取或建用户钱包 */
  async ensureWallet(userId: string): Promise<Wallet> {
    let w = await this.walletRepo.findOne({ where: { userId } });
    if (!w) {
      w = this.walletRepo.create({ userId, balance: '0.00', frozen: '0.00' });
      w = await this.walletRepo.save(w);
    }
    return w;
  }

  /** 钱包概览 + 最近 10 条流水 */
  async getOverview(userId: string) {
    const w = await this.ensureWallet(userId);
    const tx = await this.txRepo.find({
      where: { walletId: w.id },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    return { wallet: w, recent: tx };
  }

  /** 流水分页 */
  async listTransactions(
    userId: string,
    page = 1,
    pageSize = 20,
    direction?: TxDirection,
  ) {
    const w = await this.ensureWallet(userId);
    const where: Record<string, unknown> = { walletId: w.id };
    if (direction) where.direction = direction;
    const [items, total] = await this.txRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  /**
   * 增加余额(充值 / 退款 / 调整)— 写流水 + 更新余额(事务包裹)
   */
  async credit(
    userId: string,
    amount: number,
    type: TxType,
    note = '',
    relatedId = '',
  ): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (m) => {
      const walletRepo = m.getRepository(Wallet);
      const txRepo = m.getRepository(WalletTransaction);
      let w = await walletRepo.findOne({ where: { userId } });
      if (!w) {
        w = walletRepo.create({ userId, balance: '0.00', frozen: '0.00' });
        w = await walletRepo.save(w);
      }
      const newBalance = (parseFloat(w.balance) + amount).toFixed(2);
      w.balance = newBalance;
      await walletRepo.save(w);
      const tx = txRepo.create({
        walletId: w.id,
        userId,
        direction: TxDirection.IN,
        type,
        amount: amount.toFixed(2),
        balanceAfter: newBalance,
        relatedId,
        note,
      });
      return txRepo.save(tx);
    });
  }

  /**
   * 减少余额(下单 / 每日扣款)— 余额不足抛错
   */
  async debit(
    userId: string,
    amount: number,
    type: TxType,
    note = '',
    relatedId = '',
  ): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (m) => {
      const walletRepo = m.getRepository(Wallet);
      const txRepo = m.getRepository(WalletTransaction);
      let w = await walletRepo.findOne({ where: { userId } });
      if (!w) {
        w = walletRepo.create({ userId, balance: '0.00', frozen: '0.00' });
        w = await walletRepo.save(w);
      }
      if (parseFloat(w.balance) < amount) {
        throw new Error(`余额不足: 当前 ${w.balance}, 需要 ${amount.toFixed(2)}`);
      }
      const newBalance = (parseFloat(w.balance) - amount).toFixed(2);
      w.balance = newBalance;
      await walletRepo.save(w);
      const tx = txRepo.create({
        walletId: w.id,
        userId,
        direction: TxDirection.OUT,
        type,
        amount: amount.toFixed(2),
        balanceAfter: newBalance,
        relatedId,
        note,
      });
      return txRepo.save(tx);
    });
  }
}
