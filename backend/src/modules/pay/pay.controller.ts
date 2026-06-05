import { Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SkipResponseWrap } from '../../common/decorators/skip-response-wrap.decorator';
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

  @ApiBearerAuth()
  @Post('orders/:orderId/wx-prepay')
  @ApiOperation({ summary: '微信支付 JSAPI 预下单入口' })
  async wxPrepay(@Req() req: Request, @Param('orderId') orderId: string) {
    const u = req.user as User;
    return this.pay.wxPrepay(u.id, orderId);
  }

  @Public()
  @SkipResponseWrap()
  @Post('wx-notify')
  @ApiOperation({ summary: '微信支付回调入口' })
  async wxNotify(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body || {});
    return this.pay.wxNotify(rawBody, headers);
  }
}
