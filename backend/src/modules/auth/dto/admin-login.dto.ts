import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ description: '管理员手机号', example: '13800000000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'phone must be 11-digit CN mobile' })
  phone!: string;

  @ApiProperty({ description: '管理员密码', example: 'admin123' })
  @IsString()
  @Length(6, 64)
  password!: string;
}
