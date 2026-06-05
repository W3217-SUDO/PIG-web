import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { WechatPhoneDto } from './dto/wechat-phone.dto';
import { WechatPhoneService } from './wechat-phone.service';

@ApiTags('user')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly users: UserService,
    private readonly wechatPhone: WechatPhoneService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '当前用户完整资料' })
  async me(@Req() req: Request) {
    const user = req.user as User;
    return pickUser(user);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户(昵称 / 头像 / 手机)' })
  async updateMe(@Req() req: Request, @Body() dto: UpdateUserDto) {
    const user = req.user as User;
    const updated = await this.users.updateProfile(user.id, dto);
    return pickUser(updated);
  }

  @Post('me/wechat-phone')
  @ApiOperation({ summary: '用微信 getPhoneNumber code 绑定当前用户手机号' })
  async updateWechatPhone(@Req() req: Request, @Body() dto: WechatPhoneDto) {
    const user = req.user as User;
    const phone = await this.wechatPhone.getPhoneNumber(dto.code);
    const updated = await this.users.updateProfile(user.id, { phone });
    return pickUser(updated);
  }
}

function pickUser(u: User) {
  return {
    id: u.id,
    openid: u.openid,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    role: u.role,
    status: u.status,
  };
}
