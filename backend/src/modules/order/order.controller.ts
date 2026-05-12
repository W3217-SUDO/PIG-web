import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { User } from '../user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { OrderStatus } from './order.entity';
import { OrderService } from './order.service';

class ListMyOrdersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
  @IsOptional() @IsString() status?: OrderStatus;
}

@ApiTags('order')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单(状态 pending)' })
  async create(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const u = req.user as User;
    return this.orders.create(u.id, {
      pigId: dto.pigId,
      sharesCount: dto.sharesCount,
      addressId: dto.addressId,
      remark: dto.remark,
    });
  }

  @Get('me')
  @ApiOperation({ summary: '我的订单(分页 + 状态筛选)' })
  async myList(@Req() req: Request, @Query() q: ListMyOrdersDto) {
    const u = req.user as User;
    return this.orders.listMyOrders(u.id, q.page, q.pageSize, q.status);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情(含 pig + payments 嵌套)' })
  async detail(@Req() req: Request, @Param('id') id: string) {
    const u = req.user as User;
    return this.orders.getOrder(u.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单(仅 pending 可取消)' })
  async cancel(@Req() req: Request, @Param('id') id: string) {
    const u = req.user as User;
    return this.orders.cancel(u.id, id);
  }

  @Post(':id/wallet-pay')
  @ApiOperation({ summary: '钱包余额支付(pending → paid)' })
  async walletPay(@Req() req: Request, @Param('id') id: string) {
    const u = req.user as User;
    return this.orders.payByWallet(u.id, id);
  }

  @Post(':id/refund-request')
  @ApiOperation({ summary: '申请退款(paid → refund_pending)' })
  async refundRequest(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: RefundRequestDto,
  ) {
    const u = req.user as User;
    return this.orders.requestRefund(u.id, id, dto.reason);
  }

  @Post(':id/confirm-received')
  @ApiOperation({ summary: '确认收货(shipped → delivered)' })
  async confirmReceived(@Req() req: Request, @Param('id') id: string) {
    const u = req.user as User;
    return this.orders.confirmReceived(u.id, id);
  }

  @Post(':id/mock-paid')
  @ApiOperation({ summary: '开发环境 mock 支付(NODE_ENV != production)' })
  async mockPaid(@Req() req: Request, @Param('id') id: string) {
    const u = req.user as User;
    return this.orders.mockPay(u.id, id);
  }
}
