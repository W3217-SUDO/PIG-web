import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserService } from '../user/user.service';
import { User, UserStatus } from '../user/user.entity';
import { AuthService } from './auth.service';

export interface JwtPayload {
  /** user id (ULID) */
  sub: string;
  openid: string;
  role: string;
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new UnauthorizedException('token required');
    await this.authService.assertTokenNotRevoked(token);

    const user = await this.userService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('user not found');
    if (user.status === UserStatus.BANNED) throw new UnauthorizedException('user banned');
    return user;
  }
}
