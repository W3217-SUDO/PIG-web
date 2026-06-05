import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageModule } from '../message/message.module';
import { Order } from '../order/order.entity';
import { OrderPayment } from '../order/order-payment.entity';
import { OrderModule } from '../order/order.module';
import { Pig } from '../pig/pig.entity';
import { User } from '../user/user.entity';
import { PayController } from './pay.controller';
import { PayService } from './pay.service';
import { WechatPayClient, loadWechatPayConfigFromEnv } from './wechat-pay.client';

export const WECHAT_PAY_CLIENT_FACTORY = Symbol('WECHAT_PAY_CLIENT_FACTORY');

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderPayment, User, Pig]), OrderModule, MessageModule],
  controllers: [PayController],
  providers: [
    PayService,
    {
      provide: WECHAT_PAY_CLIENT_FACTORY,
      useValue: () => {
        const config = loadWechatPayConfigFromEnv();
        return config ? new WechatPayClient(config) : null;
      },
    },
  ],
})
export class PayModule {}
