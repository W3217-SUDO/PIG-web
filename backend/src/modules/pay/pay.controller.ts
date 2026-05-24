import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../user/user.entity';
import { PayService } from './pay.service';

@ApiTags('pay')
@Controller('pay')
export class PayController {
  constructor(private readonly pay: PayService) {}

  @ApiBearerAuth()
  @Get('orders/:orderId/status')
  @ApiOperation({ summary: '查询订单支付状态' })
  async status(@Req() req: Request, @Param('orderId') orderId: string) {
    const u = req.user as User;
    return this.pay.getOrderPayStatus(u.id, orderId);
  }

  @ApiBearerAuth()
  @Post('orders/:orderId/mock-prepay')
  @ApiOperation({ summary: '开发环境 mock 支付入口' })
  async mockPrepay(@Req() req: Request, @Param('orderId') orderId: string) {
    const u = req.user as User;
    return this.pay.mockPrepay(u.id, orderId);
  }

  @Public()
  @Post('wx-notify')
  @ApiOperation({ summary: '微信支付回调占位入口' })
  async wxNotify() {
    return this.pay.wxNotify();
  }
}
