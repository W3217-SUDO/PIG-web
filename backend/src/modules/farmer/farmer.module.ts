import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farmer } from './farmer.entity';

/**
 * 农户模块 v1:仅注册 entity 供其他模块查询。
 * Controller / Service 留待 S2(猪详情)需要时再补。
 */
@Module({
  imports: [TypeOrmModule.forFeature([Farmer])],
  exports: [TypeOrmModule],
})
export class FarmerModule {}
