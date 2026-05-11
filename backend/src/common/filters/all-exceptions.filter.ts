import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

interface ErrorPayload {
  code: number;
  message: string;
  data: null;
  error?: {
    type: string;
    trace_id?: string;
    [key: string]: unknown;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = (req as any).id || (req.headers['x-trace-id'] as string);

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let bizCode = 90099;
    let message = '服务器内部错误';
    let extra: Record<string, unknown> | undefined;
    let type = 'InternalError';

    if (exception instanceof BusinessException) {
      httpStatus = exception.getStatus();
      bizCode = exception.bizCode;
      message = (exception.getResponse() as any).message || exception.message;
      extra = (exception.getResponse() as any).extra;
      type = 'BusinessException';
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const resp = exception.getResponse();
      message = typeof resp === 'string' ? resp : (resp as any).message || exception.message;
      bizCode = mapHttpStatusToBizCode(httpStatus);
      type = exception.constructor.name;
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'production'
          ? '服务器内部错误'
          : exception.message;
      type = exception.constructor.name;
      this.logger.error(
        { trace_id: traceId, err: { message: exception.message, stack: exception.stack } },
        'unhandled exception',
      );
    }

    const payload: ErrorPayload = {
      code: bizCode,
      message,
      data: null,
      error: {
        type,
        trace_id: traceId,
        ...extra,
      },
    };

    res.status(httpStatus).json(payload);
  }
}

function mapHttpStatusToBizCode(status: number): number {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 90001;
    case HttpStatus.UNAUTHORIZED:
      return 10001;
    case HttpStatus.FORBIDDEN:
      return 10003;
    case HttpStatus.NOT_FOUND:
      return 90404;
    case HttpStatus.TOO_MANY_REQUESTS:
      return 90002;
    default:
      return 90099;
  }
}
