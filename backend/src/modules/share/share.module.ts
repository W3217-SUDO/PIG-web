import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareInvite } from './share-invite.entity';
import { Order } from '../order/order.entity';
import { Pig } from '../pig/pig.entity';
import { User } from '../user/user.entity';
import { ShareService } from './share.service';
import { ShareController } from './share.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShareInvite, Order, Pig, User])],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
