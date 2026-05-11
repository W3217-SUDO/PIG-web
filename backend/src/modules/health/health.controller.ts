import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  async check() {
    return this.health.check();
  }
}
