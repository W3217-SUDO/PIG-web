import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 把所有 controller 返回值包装成统一格式 { code, message, data }
 * controller 如果已经返回了带 code 的对象,就不再二次包装
 */
@Injectable()
export class ResponseWrapInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // 已经是包装好的格式,放过
        if (data && typeof data === 'object' && 'code' in (data as any) && 'data' in (data as any)) {
          return data as unknown as ApiResponse<T>;
        }
        return {
          code: 0,
          message: 'ok',
          data: data as T,
        };
      }),
    );
  }
}
