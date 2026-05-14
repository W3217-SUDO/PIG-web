import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/user/user.entity';

export const ROLES_KEY = 'roles';

/**
 * 接口级别角色权限:@Roles(UserRole.ADMIN) 或 @Roles('admin', 'merchant')。
 * 配合全局 RolesGuard 生效;未标注的接口不做角色检查(只走 JwtAuthGuard)。
 */
export const Roles = (...roles: Array<UserRole | string>) => SetMetadata(ROLES_KEY, roles);
