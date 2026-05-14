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
import { AdminLoginDto } from './dto/admin-login.dto';
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
  @ApiOperation({ summary: '开发旁路登录(默认仅 NODE_ENV !== production, DEV_LOGIN_ENABLED=true 可在生产临时打开)' })
  async devLogin(@Body() dto: DevLoginDto) {
    // 默认生产环境禁用
    // 临时旁路: DEV_LOGIN_ENABLED=true 允许(等真实小程序帐号注册下来再关掉)
    const isProd = process.env.NODE_ENV === 'production';
    const devEnabled = process.env.DEV_LOGIN_ENABLED === 'true';
    if (isProd && !devEnabled) {
      throw new ForbiddenException('dev-login disabled in production');
    }
    const { user, tokens } = await this.auth.devLogin(dto.openid);
    return { user: pickUser(user), ...tokens };
  }

  @Public()
  @Post('admin-login')
  @ApiOperation({ summary: '管理员登录(手机号 + 密码,凭据从 env 读)' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    const { user, tokens } = await this.auth.adminLogin(dto.phone, dto.password);
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
