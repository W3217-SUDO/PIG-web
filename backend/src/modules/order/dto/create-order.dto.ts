import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: '猪 ID(ULID)' })
  @IsString()
  @Length(26, 26)
  pigId!: string;

  @ApiProperty({ example: 1, description: '份额数(每份默认 pricePerShare 元)' })
  @IsInt()
  @Min(1)
  @Max(20)
  sharesCount!: number;

  @ApiProperty({ required: false, description: '收货地址 ID(ULID,可选,下单时拷贝快照)' })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  addressId?: string;

  @ApiProperty({ required: false, description: '用户备注(≤256 字)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  remark?: string;
}
