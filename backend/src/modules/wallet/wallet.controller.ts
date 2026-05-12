import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../user/user.entity';
import { WalletService } from './wallet.service';
import { TxDirection, TxType } from './wallet-transaction.entity';

class ListTxDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
  @IsOptional() @IsString() @IsIn(['in', 'out']) direction?: 'in' | 'out';
}

class TopupDto {
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  amount!: number;
}

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: '我的钱包(余额 + 最近 10 条流水)' })
  async me(@Req() req: Request) {
    const u = req.user as User;
    return this.wallet.getOverview(u.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: '钱包流水分页' })
  async transactions(@Req() req: Request, @Query() q: ListTxDto) {
    const u = req.user as User;
    return this.wallet.listTransactions(
      u.id,
      q.page,
      q.pageSize,
      q.direction as TxDirection | undefined,
    );
  }

  @Post('topup')
  @ApiOperation({ summary: '充值(v1 mock,直接到账;v1.5 接微信支付)' })
  async topup(@Req() req: Request, @Body() dto: TopupDto) {
    const u = req.user as User;
    const tx = await this.wallet.credit(
      u.id,
      dto.amount,
      TxType.TOPUP,
      'mock 充值',
    );
    return { ok: true, transaction: tx };
  }
}
