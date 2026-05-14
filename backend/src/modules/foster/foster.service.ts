import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import * as https from 'https';
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

  // ─────────────────────────── 认证 Auth ───────────────────────────

  /** 生成 30 天有效的农户 Token */
  generateFosterToken(farmerId: string): string {
    const secret = process.env.JWT_SECRET || 'dev_secret_change_before_prod_32chars_min';
    const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const payload = `${farmerId}:${expires}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  /** 验证 Token，返回 farmerId 或 null */
  validateFosterToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const lastColon = decoded.lastIndexOf(':');
      const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
      const farmerId = decoded.slice(0, secondLastColon);
      const expires = parseInt(decoded.slice(secondLastColon + 1, lastColon));
      const sig = decoded.slice(lastColon + 1);
      if (Date.now() > expires) return null;
      const secret = process.env.JWT_SECRET || 'dev_secret_change_before_prod_32chars_min';
      const payload = `${farmerId}:${expires}`;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
      return sig === expected ? farmerId : null;
    } catch { return null; }
  }

  /** 微信 code 换 openid（生产）；开发环境返回 devMode */
  async wxLoginByCode(code: string): Promise<
    | { type: 'success'; farmerId: string; farmerName: string; token: string }
    | { type: 'new_user'; openid: string; wxNickname: string; wxAvatar: string }
    | { type: 'unbound'; openid: string; farmers: { id: string; name: string; region: string }[] }
    | { type: 'dev_mode' }
  > {
    const appid = process.env.WX_MP_APPID;
    const secret = process.env.WX_MP_SECRET;

    // 没有真实 AppSecret → 开发模式
    if (!secret || secret === 'placeholder_secret' || !appid) {
      return { type: 'dev_mode' };
    }

    // 调用微信 code2session
    const openidResult = await new Promise<any>((resolve, reject) => {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('解析微信响应失败')); }
        });
      }).on('error', reject);
    });

    if (openidResult.errcode) {
      throw new BadRequestException(`微信登录失败(${openidResult.errcode}): ${openidResult.errmsg}`);
    }

    const openid: string = openidResult.openid;

    // 查找已绑定此 openid 的农户
    const farmer = await this.farmerRepo.findOne({ where: { openid } });
    if (farmer) {
      const token = this.generateFosterToken(farmer.id);
      return { type: 'success', farmerId: farmer.id, farmerName: farmer.name, token };
    }

    // openid 未绑定 → 让用户选择绑定哪个农户，或新建
    const unboundFarmers = await this.farmerRepo.find({
      where: { openid: IsNull() },
      order: { createdAt: 'ASC' },
    });

    if (unboundFarmers.length > 0) {
      return {
        type: 'unbound',
        openid,
        farmers: unboundFarmers.map(f => ({ id: f.id, name: f.name, region: f.region })),
      };
    }

    return { type: 'new_user', openid, wxNickname: '', wxAvatar: '' };
  }

  /** 绑定 openid 到已有农户（首次认领） */
  async bindFarmerOpenid(farmerId: string, openid: string, wxNickname?: string, wxAvatar?: string): Promise<{
    farmerId: string; farmerName: string; token: string;
  }> {
    const farmer = await this.farmerRepo.findOne({ where: { id: farmerId } });
    if (!farmer) throw new NotFoundException('农户不存在');
    if (farmer.openid && farmer.openid !== openid) {
      throw new BadRequestException('此农户账号已被其他微信号绑定');
    }
    farmer.openid = openid;
    if (wxNickname) farmer.wxNickname = wxNickname;
    if (wxAvatar) farmer.wxAvatar = wxAvatar;
    await this.farmerRepo.save(farmer);
    const token = this.generateFosterToken(farmer.id);
    return { farmerId: farmer.id, farmerName: farmer.name, token };
  }

  /** 新建农户并绑定 openid */
  async registerNewFarmer(dto: {
    openid: string;
    name: string;
    region: string;
    years: number;
    wxNickname?: string;
    wxAvatar?: string;
  }): Promise<{ farmerId: string; farmerName: string; token: string }> {
    // 再次检查 openid 是否已绑定
    const existing = await this.farmerRepo.findOne({ where: { openid: dto.openid } });
    if (existing) {
      const token = this.generateFosterToken(existing.id);
      return { farmerId: existing.id, farmerName: existing.name, token };
    }
    const farmer = this.farmerRepo.create({
      name: dto.name, region: dto.region, years: dto.years || 1,
      avatarUrl: dto.wxAvatar || '', story: null, videoUrl: '',
      openid: dto.openid, wxNickname: dto.wxNickname || null, wxAvatar: dto.wxAvatar || null,
    });
    await this.farmerRepo.save(farmer);
    const token = this.generateFosterToken(farmer.id);
    return { farmerId: farmer.id, farmerName: farmer.name, token };
  }

  /** 开发模式：按姓名直接登录（不校验 openid） */
  async devLoginByName(name: string): Promise<{ farmerId: string; farmerName: string; token: string }> {
    const farmer = await this.farmerRepo.findOne({ where: { name } });
    if (!farmer) throw new NotFoundException(`找不到农户"${name}"，请确认姓名或先创建账号`);
    const token = this.generateFosterToken(farmer.id);
    return { farmerId: farmer.id, farmerName: farmer.name, token };
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
          ownerNote: pig.ownerNote || '',  // 农户手填的主人备注
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

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curEntry = earnings.find(e => e.year === curYear && e.month === curMonth);
    const thisMonth = curEntry ? Number(curEntry.amount) : 0;
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

  /** 农户：更新猪只体重及主人备注（体重必须附称重图片） */
  async farmerUpdatePig(pigId: string, farmerId: string, dto: {
    weightKg?: number;
    weightImage?: string; // 称重凭证图片 URL
    ownerNote?: string;   // 主人备注（存入 description 字段）
  }) {
    const pig = await this.pigRepo.findOne({ where: { id: pigId, farmerId } });
    if (!pig) throw new NotFoundException('猪只不存在或不属于该农户');
    if (dto.weightKg !== undefined) {
      if (!dto.weightImage || dto.weightImage.trim() === '') {
        throw new BadRequestException('修改体重必须上传称重图片');
      }
      pig.weightKg = String(dto.weightKg);
      // 将称重图片记录到 photos 字段（保留最近10张）
      const existing: string[] = (pig.photos as string[]) || [];
      pig.photos = [...existing, dto.weightImage].slice(-10);
    }
    if (dto.ownerNote !== undefined) {
      pig.ownerNote = dto.ownerNote;
    }
    await this.pigRepo.save(pig);
    return {
      id: pig.id,
      weightKg: pig.weightKg ? Number(pig.weightKg) : null,
      ownerNote: pig.ownerNote || '',
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
    if (dto.weightKg !== undefined) pig.weightKg = String(dto.weightKg);
    if (dto.expectedWeightKg !== undefined) pig.expectedWeightKg = String(dto.expectedWeightKg);
    if (dto.pricePerShare !== undefined) pig.pricePerShare = String(dto.pricePerShare);
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
