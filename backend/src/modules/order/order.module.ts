import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderPayment } from './order-payment.entity';
import { Pig } from '../pig/pig.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderPayment, Pig]), MessageModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
