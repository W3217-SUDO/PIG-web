import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farmer } from './farmer.entity';
import { Pig } from '../pig/pig.entity';
import { FarmerService } from './farmer.service';
import { FarmerController } from './farmer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Farmer, Pig])],
  controllers: [FarmerController],
  providers: [FarmerService],
  exports: [TypeOrmModule, FarmerService],
})
export class FarmerModule {}
