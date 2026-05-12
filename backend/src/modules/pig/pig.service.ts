import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Pig, PigStatus } from './pig.entity';
import { Farmer } from '../farmer/farmer.entity';
import { FeedingRecord } from '../feeding/feeding-record.entity';
import { HealthRecord } from '../health/health-record.entity';

export interface PigListQuery {
  page?: number;
  pageSize?: number;
  region?: string;
}

export interface FarmerBrief {
  id: string;
  name: string;
  region: string;
  avatarUrl: string;
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
  farmer: FarmerBrief | null;
}

export interface PigDetail extends PigCard {
  description: string | null;
  weightKg: string;
  expectedWeightKg: string;
  mockVideoUrl: string;
  listedAt: Date | null;
  farmer: FarmerBriefFull | null; // 详情页带更全的农户字段
}

export interface FarmerBriefFull extends FarmerBrief {
  years: number;
  story: string | null;
}

export interface TimelineEvent {
  kind: 'feeding' | 'health';
  at: string; // ISO
  title: string;
  detail: string;
  imageUrl: string;
}

@Injectable()
export class PigService {
  constructor(
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
    @InjectRepository(Farmer) private readonly farmerRepo: Repository<Farmer>,
    @InjectRepository(FeedingRecord) private readonly feedRepo: Repository<FeedingRecord>,
    @InjectRepository(HealthRecord) private readonly healthRepo: Repository<HealthRecord>,
  ) {}

  /**
   * 可认领列表(默认 status=listed)
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

    const farmerIds = Array.from(new Set(pigs.map((p) => p.farmerId).filter((id): id is string => !!id)));
    const farmers = farmerIds.length
      ? await this.farmerRepo.find({ where: { id: In(farmerIds) } })
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

  /**
   * 详情(含农户全字段)
   */
  async getPigDetail(id: string): Promise<PigDetail> {
    const p = await this.pigRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Pig ${id} not found`);

    let farmer: FarmerBriefFull | null = null;
    if (p.farmerId) {
      const f = await this.farmerRepo.findOne({ where: { id: p.farmerId } });
      if (f) {
        farmer = {
          id: f.id,
          name: f.name,
          region: f.region,
          avatarUrl: f.avatarUrl,
          years: f.years,
          story: f.story,
        };
      }
    }

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
      description: p.description,
      weightKg: p.weightKg,
      expectedWeightKg: p.expectedWeightKg,
      mockVideoUrl: p.mockVideoUrl,
      listedAt: p.listedAt,
      farmer,
    };
  }

  /**
   * 喂养 + 健康 聚合时间线(按时间倒序)
   */
  async getPigTimeline(pigId: string, limit = 50): Promise<TimelineEvent[]> {
    const [feeds, healths] = await Promise.all([
      this.feedRepo.find({ where: { pigId }, order: { checkedAt: 'DESC' }, take: limit }),
      this.healthRepo.find({ where: { pigId }, order: { recordedAt: 'DESC' }, take: limit }),
    ]);

    const events: TimelineEvent[] = [];

    const mealLabel: Record<string, string> = {
      breakfast: '早餐打卡',
      lunch: '午餐打卡',
      dinner: '晚餐打卡',
      snack: '加餐打卡',
    };
    for (const f of feeds) {
      events.push({
        kind: 'feeding',
        at: f.checkedAt.toISOString(),
        title: mealLabel[f.mealType] || '喂养打卡',
        detail: f.foodDesc,
        imageUrl: f.imageUrl,
      });
    }

    const recordLabel: Record<string, string> = {
      checkup: '体检',
      vaccine: '疫苗',
      vet: '兽医出诊',
      event: '异常事件',
      weight: '称重',
    };
    for (const h of healths) {
      events.push({
        kind: 'health',
        at: h.recordedAt.toISOString(),
        title: recordLabel[h.recordType] || '健康档案',
        detail: h.detail,
        imageUrl: h.imageUrl,
      });
    }

    events.sort((a, b) => (a.at > b.at ? -1 : 1));
    return events.slice(0, limit);
  }
}
