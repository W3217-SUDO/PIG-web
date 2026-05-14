import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { User } from '../../modules/user/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * 角色守卫:跟在 JwtAuthGuard 后面跑。
 * - 接口没有 @Roles() 标记 → 放行(不限角色)
 * - 接口标了 @Roles('admin') → req.user.role 必须命中其中之一
 *
 * 通过在需要保护的接口加 @Roles(UserRole.ADMIN) 即可启用。
 * 未启用前对现有接口零影响。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as User | undefined;
    if (!user) throw new ForbiddenException('未登录');
    if (!required.includes(user.role)) {
      throw new ForbiddenException(`角色 ${user.role} 无权访问,需要:${required.join(' / ')}`);
    }
    return true;
  }
}
