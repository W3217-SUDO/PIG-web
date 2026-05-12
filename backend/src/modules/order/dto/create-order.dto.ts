import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

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
}
