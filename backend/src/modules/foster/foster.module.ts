import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FosterController } from './foster.controller';
import { FosterService } from './foster.service';
import { FarmerTask } from './farmer-task.entity';
import { FarmerEarning } from './farmer-earning.entity';
import { Pig } from '../pig/pig.entity';
import { HealthRecord } from '../health/health-record.entity';
import { Order } from '../order/order.entity';
import { User } from '../user/user.entity';
import { Farmer } from '../farmer/farmer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FarmerTask,
      FarmerEarning,
      Pig,
      HealthRecord,
      Order,
      User,
      Farmer,
    ]),
  ],
  controllers: [FosterController],
  providers: [FosterService],
})
export class FosterModule {}
