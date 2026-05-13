import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmerTask, FarmerMealType } from './farmer-task.entity';
import { FarmerEarning } from './farmer-earning.entity';
import { Pig, PigStatus } from '../pig/pig.entity';
import { HealthRecord } from '../health/health-record.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { User } from '../user/user.entity';
import { Farmer } from '../farmer/farmer.entity';

type TaskStatus = 'pending' | 'in_progress' | 'done';

const MEAL_LABELS: Record<FarmerMealType, string> = {
  [FarmerMealType.BREAKFAST]: '早餐喂养',
  [FarmerMealType.LUNCH]: '午餐喂养',
  [FarmerMealType.DINNER]: '晚餐喂养',
};

const MEAL_ICONS: Record<FarmerMealType, string> = {
  [FarmerMealType.BREAKFAST]: '🌅',
  [FarmerMealType.LUNCH]: '☀️',
  [FarmerMealType.DINNER]: '🌙',
};

@Injectable()
export class FosterService {
  constructor(
    @InjectRepository(FarmerTask)
    private readonly taskRepo: Repository<FarmerTask>,
    @InjectRepository(FarmerEarning)
    private readonly earningRepo: Repository<FarmerEarning>,
    @InjectRepository(Pig)
    private readonly pigRepo: Repository<Pig>,
    @InjectRepository(HealthRecord)
    private readonly healthRepo: Repository<HealthRecord>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Farmer)
    private readonly farmerRepo: Repository<Farmer>,
  ) {}

  /** 根据时段和打卡状态计算任务状态 */
  private computeStatus(task: FarmerTask): TaskStatus {
    if (task.checkedAt) return 'done';
    const [startStr] = task.timeSlot.split('-');
    const [sh, sm] = startStr.trim().split(':').map(Number);
    const now = new Date();
    const startMinutes = sh * 60 + sm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes >= startMinutes ? 'in_progress' : 'pending';
  }

  private formatTask(task: FarmerTask) {
    return {
      id: task.id,
      mealType: task.mealType,
      label: MEAL_LABELS[task.mealType],
      icon: MEAL_ICONS[task.mealType],
      foodDesc: task.foodDesc,
      area: task.area,
      timeSlot: task.timeSlot,
      status: this.computeStatus(task),
      checkedAt: task.checkedAt,
      imageUrl: task.imageUrl,
    };
  }

  /** 获取所有农户列表(用于代养人选择登录) */
  async getFarmers() {
    const farmers = await this.farmerRepo.find({ order: { createdAt: 'ASC' } });
    return farmers.map(f => ({
      id: f.id,
      name: f.name,
      region: f.region,
      years: f.years,
      avatarUrl: f.avatarUrl,
    }));
  }

  /** 工作台总览 */
  async getDashboard(farmerId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [pigCount, tasks] = await Promise.all([
      this.pigRepo.count({ where: { farmerId, status: PigStatus.LISTED } }),
      this.taskRepo.find({
        where: { farmerId, scheduledDate: today },
        order: { timeSlot: 'ASC' },
      }),
    ]);

    const formattedTasks = tasks.map(t => this.formatTask(t));
    const pendingCount = formattedTasks.filter(t => t.status !== 'done').length;

    return {
      pigCount,
      pendingTaskCount: pendingCount,
      todayTasks: formattedTasks,
    };
  }

  /** 今日喂养任务 */
  async getTodayTasks(farmerId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await this.taskRepo.find({
      where: { farmerId, scheduledDate: today },
      order: { timeSlot: 'ASC' },
    });
    return tasks.map(t => this.formatTask(t));
  }

  /** 打卡 */
  async checkinTask(taskId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (!task.checkedAt) {
      task.checkedAt = new Date();
      await this.taskRepo.save(task);
    }
    return this.formatTask(task);
  }

  /** 我的猪只 */
  async getFarmerPigs(farmerId: string) {
    const pigs = await this.pigRepo.find({
      where: { farmerId },
      order: { createdAt: 'ASC' },
    });

    const items = await Promise.all(
      pigs.map(async (pig, idx) => {
        // 最新健康记录
        const latestHealth = await this.healthRepo.findOne({
          where: { pigId: pig.id },
          order: { recordedAt: 'DESC' },
        });

        // 最新已付款订单 → 获取认领人
        const activeOrder = await this.orderRepo.findOne({
          where: { pigId: pig.id, status: OrderStatus.PAID },
          order: { createdAt: 'DESC' },
        });

        let ownerName = '';
        if (activeOrder) {
          const owner = await this.userRepo.findOne({ where: { id: activeOrder.userId } });
          ownerName = owner?.nickname || '认领用户';
        }

        // 养殖天数(从 listedAt 或 createdAt 算起)
        const baseDate = pig.listedAt ? new Date(pig.listedAt) : new Date(pig.createdAt);
        const daysRaised = Math.floor((Date.now() - baseDate.getTime()) / 86400000);

        // 栏位编号 #A001 …
        const stallNo = `#A${String(idx + 1).padStart(3, '0')}`;

        // 健康状态: 返回英文代码供前端映射
        let healthStatus = 'unknown';
        if (latestHealth) {
          if (latestHealth.recordType === 'event') healthStatus = 'sick';
          else healthStatus = 'healthy';
        }

        return {
          id: pig.id,
          nickname: pig.breed || pig.title.split('·')[0].trim(),
          stallNo,
          healthStatus,
          ownerName,
          daysRaised: Math.max(0, daysRaised),
          weightKg: pig.weightKg ? Number(pig.weightKg) : null,
        };
      }),
    );

    return items;
  }

  /** 收益中心 */
  async getEarnings(farmerId: string) {
    const earnings = await this.earningRepo.find({
      where: { farmerId },
      order: { year: 'DESC', month: 'DESC' },
    });

    const thisMonth = earnings[0] ? Number(earnings[0].amount) : 0;
    const total = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      thisMonth,
      total,
      list: earnings.map(e => ({
        year: e.year,
        month: e.month,
        amount: Number(e.amount),
      })),
    };
  }

  // ─────────────────────────── 管理员 CRUD ───────────────────────────

  /** 管理员：获取全部农户（含 id，用于编辑） */
  async adminGetFarmers() {
    return this.farmerRepo.find({ order: { createdAt: 'ASC' } });
  }

  /** 管理员：创建农户 */
  async adminCreateFarmer(dto: {
    name: string; region: string; years: number;
    avatarUrl?: string; story?: string; videoUrl?: string;
  }) {
    const farmer = this.farmerRepo.create({
      name: dto.name, region: dto.region, years: dto.years || 0,
      avatarUrl: dto.avatarUrl || '', story: dto.story || null,
      videoUrl: dto.videoUrl || '',
    });
    return this.farmerRepo.save(farmer);
  }

  /** 管理员：更新农户 */
  async adminUpdateFarmer(id: string, dto: Partial<{
    name: string; region: string; years: number;
    avatarUrl: string; story: string; videoUrl: string;
  }>) {
    const farmer = await this.farmerRepo.findOne({ where: { id } });
    if (!farmer) throw new NotFoundException('农户不存在');
    Object.assign(farmer, dto);
    return this.farmerRepo.save(farmer);
  }

  /** 管理员：删除农户 */
  async adminDeleteFarmer(id: string) {
    const farmer = await this.farmerRepo.findOne({ where: { id } });
    if (!farmer) throw new NotFoundException('农户不存在');
    await this.farmerRepo.remove(farmer);
    return { ok: true };
  }

  /** 管理员：获取全部猪只（所有状态） */
  async adminGetPigs() {
    const pigs = await this.pigRepo.find({ order: { createdAt: 'DESC' } });
    const farmers = await this.farmerRepo.find();
    const farmerMap = new Map(farmers.map(f => [f.id, f.name]));
    return pigs.map(p => ({
      id: p.id, title: p.title, breed: p.breed,
      farmerId: p.farmerId, farmerName: farmerMap.get(p.farmerId ?? '') || '未分配',
      region: p.region, weightKg: Number(p.weightKg),
      expectedWeightKg: Number(p.expectedWeightKg),
      pricePerShare: Number(p.pricePerShare),
      totalShares: p.totalShares, soldShares: p.soldShares,
      status: p.status, coverImage: p.coverImage,
    }));
  }

  /** 管理员：创建猪只 */
  async adminCreatePig(dto: {
    title: string; breed: string; farmerId: string; region: string;
    weightKg: number; expectedWeightKg?: number;
    pricePerShare: number; totalShares: number;
    coverImage?: string; description?: string;
  }) {
    const pig = this.pigRepo.create({
      title: dto.title, breed: dto.breed,
      farmerId: dto.farmerId, region: dto.region,
      weightKg: String(dto.weightKg),
      expectedWeightKg: String(dto.expectedWeightKg ?? dto.weightKg * 4),
      pricePerShare: String(dto.pricePerShare),
      totalShares: dto.totalShares, soldShares: 0,
      coverImage: dto.coverImage || '',
      description: dto.description || null,
      merchantId: dto.farmerId, // v1 用 farmerId 兼容
      status: 'listed' as any,
    });
    return this.pigRepo.save(pig);
  }

  /** 管理员：更新猪只 */
  async adminUpdatePig(id: string, dto: Partial<{
    title: string; breed: string; farmerId: string; region: string;
    weightKg: number; expectedWeightKg: number;
    pricePerShare: number; totalShares: number;
    coverImage: string; description: string; status: string;
  }>) {
    const pig = await this.pigRepo.findOne({ where: { id } });
    if (!pig) throw new NotFoundException('猪只不存在');
    if (dto.weightKg !== undefined) (pig as any).weightKg = String(dto.weightKg);
    if (dto.expectedWeightKg !== undefined) (pig as any).expectedWeightKg = String(dto.expectedWeightKg);
    if (dto.pricePerShare !== undefined) (pig as any).pricePerShare = String(dto.pricePerShare);
    const { weightKg, expectedWeightKg, pricePerShare, ...rest } = dto;
    Object.assign(pig, rest);
    return this.pigRepo.save(pig);
  }

  /** 管理员：删除猪只 */
  async adminDeletePig(id: string) {
    const pig = await this.pigRepo.findOne({ where: { id } });
    if (!pig) throw new NotFoundException('猪只不存在');
    await this.pigRepo.remove(pig);
    return { ok: true };
  }

  /** 管理员：为指定农户生成今日任务 */
  async adminCreateTodayTasks(farmerId: string, tasks: Array<{
    mealType: 'breakfast' | 'lunch' | 'dinner';
    foodDesc: string; area: string; timeSlot: string;
  }>) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    // 清除今日已有任务
    await this.taskRepo
      .createQueryBuilder()
      .delete()
      .where('farmer_id = :farmerId AND scheduled_date = :today', { farmerId, today })
      .execute();
    const rows = tasks.map(t =>
      this.taskRepo.create({ farmerId, mealType: t.mealType as any,
        foodDesc: t.foodDesc, area: t.area, timeSlot: t.timeSlot,
        scheduledDate: today, checkedAt: null, imageUrl: '' })
    );
    await this.taskRepo.save(rows);
    return rows.map(r => this.formatTask(r));
  }
}
