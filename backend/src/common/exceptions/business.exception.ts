import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常。
 * HTTP 状态码统一 200(或 422),业务码通过 BusinessException(code) 表达。
 *
 * @example
 *   throw new BusinessException(40004, '你不是主认领人');
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly bizCode: number,
    message: string,
    httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    public readonly extra?: Record<string, unknown>,
  ) {
    super({ bizCode, message, extra }, httpStatus);
  }
}
