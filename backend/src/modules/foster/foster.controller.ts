import { Controller, Get, Post, Patch, Delete, Param, Query, Body, BadRequestException } from '@nestjs/common';
import { FosterService } from './foster.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 代养人端 API
 * 全部 @Public() — 代养人端使用独立的 farmerId 标识,不走客户端 JWT
 */
@Public()
@Controller('foster')
export class FosterController {
  constructor(private readonly fosterService: FosterService) {}

  // ─────────────────────── 代养人只读接口 ───────────────────────

  @Get('farmers')
  async getFarmers() {
    const data = await this.fosterService.getFarmers();
    return { code: 0, message: 'ok', data };
  }

  @Get('dashboard')
  async getDashboard(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getDashboard(farmerId);
    return { code: 0, message: 'ok', data };
  }

  @Get('tasks/today')
  async getTodayTasks(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getTodayTasks(farmerId);
    return { code: 0, message: 'ok', data };
  }

  @Post('tasks/:id/checkin')
  async checkinTask(@Param('id') id: string) {
    const data = await this.fosterService.checkinTask(id);
    return { code: 0, message: '打卡成功', data };
  }

  @Get('pigs')
  async getFarmerPigs(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getFarmerPigs(farmerId);
    return { code: 0, message: 'ok', data };
  }

  @Get('earnings')
  async getEarnings(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getEarnings(farmerId);
    return { code: 0, message: 'ok', data };
  }

  // ─────────────────────── 管理员 CRUD ───────────────────────

  /** 管理：获取全部农户（含所有字段） */
  @Get('admin/farmers')
  async adminGetFarmers() {
    const data = await this.fosterService.adminGetFarmers();
    return { code: 0, message: 'ok', data };
  }

  /** 管理：新增农户 */
  @Post('admin/farmers')
  async adminCreateFarmer(@Body() body: any) {
    if (!body.name || !body.region) throw new BadRequestException('name 和 region 必填');
    const data = await this.fosterService.adminCreateFarmer(body);
    return { code: 0, message: '创建成功', data };
  }

  /** 管理：更新农户 */
  @Patch('admin/farmers/:id')
  async adminUpdateFarmer(@Param('id') id: string, @Body() body: any) {
    const data = await this.fosterService.adminUpdateFarmer(id, body);
    return { code: 0, message: '更新成功', data };
  }

  /** 管理：删除农户 */
  @Delete('admin/farmers/:id')
  async adminDeleteFarmer(@Param('id') id: string) {
    const data = await this.fosterService.adminDeleteFarmer(id);
    return { code: 0, message: '删除成功', data };
  }

  /** 管理：获取全部猪只（所有状态） */
  @Get('admin/pigs')
  async adminGetPigs() {
    const data = await this.fosterService.adminGetPigs();
    return { code: 0, message: 'ok', data };
  }

  /** 管理：新增猪只 */
  @Post('admin/pigs')
  async adminCreatePig(@Body() body: any) {
    if (!body.title || !body.farmerId) throw new BadRequestException('title 和 farmerId 必填');
    const data = await this.fosterService.adminCreatePig(body);
    return { code: 0, message: '创建成功', data };
  }

  /** 管理：更新猪只 */
  @Patch('admin/pigs/:id')
  async adminUpdatePig(@Param('id') id: string, @Body() body: any) {
    const data = await this.fosterService.adminUpdatePig(id, body);
    return { code: 0, message: '更新成功', data };
  }

  /** 管理：删除猪只 */
  @Delete('admin/pigs/:id')
  async adminDeletePig(@Param('id') id: string) {
    const data = await this.fosterService.adminDeletePig(id);
    return { code: 0, message: '删除成功', data };
  }

  /** 管理：生成农户今日任务 */
  @Post('admin/tasks')
  async adminCreateTasks(@Body() body: { farmerId: string; tasks: any[] }) {
    if (!body.farmerId || !body.tasks?.length) throw new BadRequestException('farmerId 和 tasks 必填');
    const data = await this.fosterService.adminCreateTodayTasks(body.farmerId, body.tasks);
    return { code: 0, message: `已生成 ${data.length} 条任务`, data };
  }
}
