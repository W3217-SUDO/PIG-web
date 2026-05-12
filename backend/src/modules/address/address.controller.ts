import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { User } from '../user/user.entity';
import { AddressService } from './address.service';
import { UpsertAddressDto } from './dto/upsert-address.dto';

@ApiTags('user')
@ApiBearerAuth()
@Controller('users/me/addresses')
export class AddressController {
  constructor(private readonly addresses: AddressService) {}

  @Get()
  @ApiOperation({ summary: '我的收货地址列表(默认在前)' })
  async list(@Req() req: Request) {
    const user = req.user as User;
    return this.addresses.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: '新增收货地址' })
  async create(@Req() req: Request, @Body() dto: UpsertAddressDto) {
    const user = req.user as User;
    return this.addresses.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新收货地址' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpsertAddressDto) {
    const user = req.user as User;
    return this.addresses.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除收货地址' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    return this.addresses.remove(user.id, id);
  }
}
