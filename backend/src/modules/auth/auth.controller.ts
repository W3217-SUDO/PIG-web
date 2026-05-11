import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { WxLoginDto } from './dto/wx-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('wx-login')
  @ApiOperation({ summary: '微信小程序登录(生产路径)' })
  async wxLogin(@Body() dto: WxLoginDto) {
    const { user, tokens } = await this.auth.wxLogin(dto);
    return { user: pickUser(user), ...tokens };
  }

  @Public()
  @Post('dev-login')
  @ApiOperation({ summary: '开发旁路登录(仅 NODE_ENV !== production)' })
  async devLogin(@Body() dto: DevLoginDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('dev-login disabled in production');
    }
    const { user, tokens } = await this.auth.devLogin(dto.openid);
    return { user: pickUser(user), ...tokens };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前用户(用于验证 token 有效)' })
  async me(@Req() req: Request) {
    const user = req.user as User;
    return pickUser(user);
  }
}

function pickUser(u: User) {
  return {
    id: u.id,
    openid: u.openid,
    nickname: u.nickname,
    avatar_url: u.avatarUrl,
    role: u.role,
    status: u.status,
  };
}
