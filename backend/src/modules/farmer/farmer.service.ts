import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Farmer } from './farmer.entity';
import { Pig, PigStatus } from '../pig/pig.entity';

export interface FarmerDetail {
  id: string;
  name: string;
  region: string;
  years: number;
  avatarUrl: string;
  story: string | null;
  videoUrl: string;
  // 衍生统计(在养 + 已卖完)
  listingPigsCount: number;
  totalPigsCount: number;
}

@Injectable()
export class FarmerService {
  constructor(
    @InjectRepository(Farmer) private readonly farmerRepo: Repository<Farmer>,
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
  ) {}

  async getFarmer(id: string): Promise<FarmerDetail> {
    const f = await this.farmerRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('农户不存在');
    const [listingPigsCount, totalPigsCount] = await Promise.all([
      this.pigRepo.count({ where: { farmerId: id, status: PigStatus.LISTED } }),
      this.pigRepo.count({ where: { farmerId: id } }),
    ]);
    return {
      id: f.id,
      name: f.name,
      region: f.region,
      years: f.years,
      avatarUrl: f.avatarUrl,
      story: f.story,
      videoUrl: f.videoUrl,
      listingPigsCount,
      totalPigsCount,
    };
  }

  /**
   * 农户名下所有猪(默认仅 listed)
   * 用于"老李家的猪都看一遍"这种场景
   */
  async getFarmerPigs(id: string, all = false): Promise<Pig[]> {
    const where: Record<string, unknown> = { farmerId: id };
    if (!all) where.status = PigStatus.LISTED;
    return this.pigRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
