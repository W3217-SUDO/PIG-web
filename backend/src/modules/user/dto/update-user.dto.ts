import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '老李', description: '昵称(1-32 字符)' })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nickname?: string;

  @ApiPropertyOptional({ example: 'https://xxx/avatar.png' })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'phone 必须是 11 位中国大陆手机号' })
  phone?: string;
}
