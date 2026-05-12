import { Controller, Get, Query } from '@nestjs/common';
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
}
