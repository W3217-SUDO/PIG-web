import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../user/user.entity';
import { ShareService } from './share.service';

@ApiTags('share')
@Controller()
export class ShareController {
  constructor(private readonly share: ShareService) {}

  @ApiBearerAuth()
  @Post('orders/:orderId/share')
  @ApiOperation({ summary: '主认领人生成拼猪邀请短链(8 位短码, 30 天 TTL)' })
  async create(@Req() req: Request, @Param('orderId') orderId: string) {
    const u = req.user as User;
    return this.share.createInvite(u.id, orderId);
  }

  @Public()
  @Get('share/:code')
  @ApiOperation({ summary: '受邀人凭码查看简版订单 + 猪信息(无需登录)' })
  async lookup(@Param('code') code: string) {
    return this.share.lookup(code);
  }
}
