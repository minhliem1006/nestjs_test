import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req    = context.switchToHttp().getRequest();
    const method = req.method;
    const url    = req.url;
    const start  = Date.now();

    return next.handle().pipe(
      // tap: chạy side-effect khi Observable emit (request thành công)
      // không làm thay đổi dữ liệu như map
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} → 200 | ${ms}ms`);
      }),

      // catchError: bắt lỗi để log rồi re-throw
      // không nuốt lỗi — vẫn để HttpExceptionFilter xử lý tiếp
      catchError((err) => {
        const ms         = Date.now() - start;
        const statusCode = err.status ?? 500;
        this.logger.warn(`${method} ${url} → ${statusCode} | ${ms}ms`);
        return throwError(() => err);
      }),
    );
  }
}
