import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/order.entity';
import { OrderPayment } from '../order/order-payment.entity';
import { OrderModule } from '../order/order.module';
import { PayController } from './pay.controller';
import { PayService } from './pay.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderPayment]), OrderModule],
  controllers: [PayController],
  providers: [PayService],
})
export class PayModule {}
