import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './address.entity';
import { UpsertAddressDto } from './dto/upsert-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address) private readonly repo: Repository<Address>,
  ) {}

  async list(userId: string): Promise<Address[]> {
    return this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: UpsertAddressDto): Promise<Address> {
    const wantsDefault = dto.isDefault === true;
    if (wantsDefault) {
      await this.repo.update({ userId, isDefault: true }, { isDefault: false });
    }
    // 如果用户没有任何地址,首条强制为 default
    const count = await this.repo.count({ where: { userId } });
    const isDefault = wantsDefault || count === 0;
    const a = this.repo.create({ ...dto, userId, isDefault });
    return this.repo.save(a);
  }

  async update(userId: string, id: string, dto: UpsertAddressDto): Promise<Address> {
    const a = await this.repo.findOne({ where: { id, userId } });
    if (!a) throw new NotFoundException(`address ${id} not found`);
    if (dto.isDefault === true && !a.isDefault) {
      await this.repo.update({ userId, isDefault: true }, { isDefault: false });
    }
    Object.assign(a, dto, { isDefault: dto.isDefault ?? a.isDefault });
    return this.repo.save(a);
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const a = await this.repo.findOne({ where: { id, userId } });
    if (!a) throw new NotFoundException(`address ${id} not found`);
    const wasDefault = a.isDefault;
    await this.repo.remove(a);
    // 如果删的是默认地址,把最近建的一条提为默认
    if (wasDefault) {
      const next = await this.repo.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (next) {
        next.isDefault = true;
        await this.repo.save(next);
      }
    }
    return { id };
  }
}
