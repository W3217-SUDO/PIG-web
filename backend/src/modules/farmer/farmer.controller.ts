import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { FarmerService } from './farmer.service';

@ApiTags('farmer')
@Controller('farmers')
export class FarmerController {
  constructor(private readonly farmers: FarmerService) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '农户详情 + 在养/总猪数统计' })
  async detail(@Param('id') id: string) {
    return this.farmers.getFarmer(id);
  }

  @Public()
  @Get(':id/pigs')
  @ApiOperation({ summary: '农户名下的猪(默认仅 listed,?all=1 含已卖)' })
  async pigs(@Param('id') id: string, @Query('all') all?: string) {
    return this.farmers.getFarmerPigs(id, all === '1');
  }
}
