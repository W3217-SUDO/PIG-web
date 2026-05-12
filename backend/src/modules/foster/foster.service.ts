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
}
