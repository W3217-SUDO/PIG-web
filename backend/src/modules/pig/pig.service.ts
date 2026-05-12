import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig, PigStatus } from './pig.entity';
import { Farmer } from '../farmer/farmer.entity';

export interface PigListQuery {
  page?: number;
  pageSize?: number;
  region?: string;
}

export interface PigCard {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
  pricePerShare: string;
  totalShares: number;
  soldShares: number;
  status: PigStatus;
  farmer: { id: string; name: string; region: string; avatarUrl: string } | null;
}

@Injectable()
export class PigService {
  constructor(
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
    @InjectRepository(Farmer) private readonly farmerRepo: Repository<Farmer>,
  ) {}

  /**
   * 可认领列表(默认 status=listed)
   * 简化版:不强求 join,先各查再 map(数据量小,可读性优先)
   */
  async listPigs(q: PigListQuery): Promise<{ items: PigCard[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, q.pageSize ?? 20));

    const where: Record<string, unknown> = { status: PigStatus.LISTED };
    if (q.region) where.region = q.region;

    const [pigs, total] = await this.pigRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 批量取农户
    const farmerIds = Array.from(new Set(pigs.map((p) => p.farmerId).filter((id): id is string => !!id)));
    const farmers = farmerIds.length
      ? await this.farmerRepo.findByIds(farmerIds)
      : [];
    const farmerMap = new Map(farmers.map((f) => [f.id, f]));

    const items: PigCard[] = pigs.map((p) => {
      const f = p.farmerId ? farmerMap.get(p.farmerId) : null;
      return {
        id: p.id,
        title: p.title,
        breed: p.breed,
        region: p.region,
        coverImage: p.coverImage,
        pricePerShare: p.pricePerShare,
        totalShares: p.totalShares,
        soldShares: p.soldShares,
        status: p.status,
        farmer: f
          ? { id: f.id, name: f.name, region: f.region, avatarUrl: f.avatarUrl }
          : null,
      };
    });

    return { items, total, page, pageSize };
  }
}
