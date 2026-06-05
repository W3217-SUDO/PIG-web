import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WechatPhoneDto {
  @ApiProperty({ description: '微信 getPhoneNumber 返回的一次性 code' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
