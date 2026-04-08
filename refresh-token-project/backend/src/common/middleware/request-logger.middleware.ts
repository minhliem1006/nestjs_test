import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Middleware chạy trước tất cả: Guard, Interceptor, Pipe, Controller
// Ở đây chưa có req.user vì JWT Guard chưa chạy
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Middleware');

  // NestJS gọi use() cho mỗi request khớp với route đã đăng ký
  // next() → chuyển request sang bước tiếp theo (Guard → Interceptor → Controller)
  // không gọi next() → request bị treo
  use(req: Request, res: Response, next: NextFunction) {
    const { method, url, ip } = req;

    this.logger.log(`→ [${method}] ${url} | ip=${ip}`);

    next();
  }
}
