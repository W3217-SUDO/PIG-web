import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { User } from '../user/user.entity';
import { MessageService } from './message.service';

class ListMessagesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
  @IsOptional() @IsBooleanString() unread?: string;
}

@ApiTags('message')
@ApiBearerAuth()
@Controller('messages')
export class MessageController {
  constructor(private readonly messages: MessageService) {}

  @Get()
  @ApiOperation({ summary: '消息列表(分页 + 未读筛选)' })
  async list(@Req() req: Request, @Query() q: ListMessagesDto) {
    const u = req.user as User;
    return this.messages.list(u.id, q.page, q.pageSize, q.unread === 'true');
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记单条已读' })
  async read(@Req() req: Request, @Param('id') id: string) {
    const u = req.user as User;
    return this.messages.markRead(u.id, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部已读' })
  async readAll(@Req() req: Request) {
    const u = req.user as User;
    return this.messages.markAllRead(u.id);
  }
}
