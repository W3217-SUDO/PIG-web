import { Controller, Get, Post, Param, Query, BadRequestException } from '@nestjs/common';
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

  /** 获取农户列表(用于代养人选择登录) */
  @Get('farmers')
  async getFarmers() {
    const data = await this.fosterService.getFarmers();
    return { code: 0, message: 'ok', data };
  }

  /** 工作台总览 */
  @Get('dashboard')
  async getDashboard(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getDashboard(farmerId);
    return { code: 0, message: 'ok', data };
  }

  /** 今日喂养任务列表 */
  @Get('tasks/today')
  async getTodayTasks(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getTodayTasks(farmerId);
    return { code: 0, message: 'ok', data };
  }

  /** 任务打卡 */
  @Post('tasks/:id/checkin')
  async checkinTask(@Param('id') id: string) {
    const data = await this.fosterService.checkinTask(id);
    return { code: 0, message: '打卡成功', data };
  }

  /** 我的猪只 */
  @Get('pigs')
  async getFarmerPigs(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getFarmerPigs(farmerId);
    return { code: 0, message: 'ok', data };
  }

  /** 收益中心 */
  @Get('earnings')
  async getEarnings(@Query('farmerId') farmerId: string) {
    if (!farmerId) throw new BadRequestException('farmerId 不能为空');
    const data = await this.fosterService.getEarnings(farmerId);
    return { code: 0, message: 'ok', data };
  }
}
