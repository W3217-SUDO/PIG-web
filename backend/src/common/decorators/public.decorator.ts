import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记接口为公开(不需要 JWT 鉴权)。
 * 用法:
 *   @Public()
 *   @Post('login')
 *   async login() {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
