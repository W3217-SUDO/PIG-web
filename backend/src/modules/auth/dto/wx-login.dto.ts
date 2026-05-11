import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class WxLoginDto {
  @ApiProperty({ description: '小程序 wx.login() 返回的 code', example: '0a3...' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ required: false, description: '可选: 用户授权后传入的昵称' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiProperty({ required: false, description: '可选: 用户授权后传入的头像 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;
}
