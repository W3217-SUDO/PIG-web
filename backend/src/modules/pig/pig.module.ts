import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from './pig.entity';
import { Farmer } from '../farmer/farmer.entity';
import { FeedingRecord } from '../feeding/feeding-record.entity';
import { HealthRecord } from '../health/health-record.entity';
import { PigService } from './pig.service';
import { PigController } from './pig.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pig, Farmer, FeedingRecord, HealthRecord])],
  controllers: [PigController],
  providers: [PigService],
  exports: [PigService],
})
export class PigModule {}
