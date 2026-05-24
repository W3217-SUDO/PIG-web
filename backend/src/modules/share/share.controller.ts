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

  @ApiBearerAuth()
  @Post('share/:code/join')
  @ApiOperation({ summary: '受邀人加入拼猪围观组(幂等)' })
  async join(@Req() req: Request, @Param('code') code: string) {
    const u = req.user as User;
    return this.share.join(code, u.id);
  }

  @ApiBearerAuth()
  @Get('share/:code/members')
  @ApiOperation({ summary: '查看拼猪成员列表(主认领人/成员可看)' })
  async members(@Req() req: Request, @Param('code') code: string) {
    const u = req.user as User;
    return this.share.members(code, u.id);
  }
}
