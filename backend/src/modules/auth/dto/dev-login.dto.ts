import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DevLoginDto {
  @ApiProperty({
    required: false,
    description: '指定 openid (默认 dev_user_001), 仅 NODE_ENV !== production 可用',
    example: 'dev_user_001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  openid?: string;
}
