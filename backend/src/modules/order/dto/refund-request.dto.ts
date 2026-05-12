import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefundRequestDto {
  @ApiProperty({ description: '退款原因(2~256 字)', example: '尺寸不合适,想换一头' })
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  reason!: string;
}
