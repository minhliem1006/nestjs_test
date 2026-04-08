import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// NestInterceptor<T, R>:
//   T = kiểu dữ liệu controller trả về
//   R = kiểu dữ liệu sau khi interceptor transform
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    // next.handle() → trả về Observable chứa response từ controller
    // .pipe(map(...)) → biến đổi dữ liệu trước khi gửi về FE
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
