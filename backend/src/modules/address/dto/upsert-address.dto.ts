import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpsertAddressDto {
  @ApiProperty()
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'phone 必须是 11 位中国大陆手机号' })
  phone!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  province!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 32)
  district?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 256)
  detail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
