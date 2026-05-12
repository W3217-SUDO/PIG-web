import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from './pig.entity';
import { Farmer } from '../farmer/farmer.entity';
import { PigService } from './pig.service';
import { PigController } from './pig.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pig, Farmer])],
  controllers: [PigController],
  providers: [PigService],
  exports: [PigService],
})
export class PigModule {}
