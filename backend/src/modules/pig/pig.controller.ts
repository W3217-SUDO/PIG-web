import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListPigsDto } from './dto/list-pigs.dto';
import { PigService } from './pig.service';

@ApiTags('pig')
@Controller('pigs')
export class PigController {
  constructor(private readonly pigs: PigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '猪列表(默认 status=listed, 可按地区筛选)' })
  async list(@Query() q: ListPigsDto) {
    return this.pigs.listPigs(q);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '猪详情(含农户全字段)' })
  async detail(@Param('id') id: string) {
    return this.pigs.getPigDetail(id);
  }

  @Public()
  @Get(':id/timeline')
  @ApiOperation({ summary: '猪时间线(喂养 + 健康, 按时间倒序)' })
  async timeline(@Param('id') id: string) {
    return this.pigs.getPigTimeline(id);
  }
}
