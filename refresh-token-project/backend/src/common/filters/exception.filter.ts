import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

// @Catch(HttpException) → filter này chỉ bắt các lỗi là HttpException
// (UnauthorizedException, ConflictException, ForbiddenException, BadRequestException...)
// Lỗi không phải HttpException (ví dụ: bug code throw new Error()) sẽ không bị bắt ở đây
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // ArgumentsHost là wrapper trung lập — có thể là HTTP, WS, RPC
    // switchToHttp() để lấy đúng req/res của HTTP context
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus();

    // getResponse() trả về string hoặc object tùy cách throw
    // VD: throw new UnauthorizedException('Sai mật khẩu') → { message: 'Sai mật khẩu', ... }
    // VD: throw new BadRequestException([...]) → { message: [...], error: 'Bad Request', ... }
    const exceptionResponse = exception.getResponse();

    // Lấy message: ưu tiên field message trong response object, fallback về tên exception
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message ?? exception.message;
  
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
