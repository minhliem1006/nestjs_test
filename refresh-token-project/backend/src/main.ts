import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Đọc cookie từ request (cần để đọc refreshToken cookie)
  app.use(cookieParser());

  // Chuẩn hóa tất cả response lỗi về một format thống nhất
  app.useGlobalFilters(new HttpExceptionFilter());

  // Log thời gian xử lý mỗi request
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Wrap tất cả response thành công về { success: true, data: ... }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Tự động validate request body theo DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // tự động bỏ các field không có trong DTO
    forbidNonWhitelisted: true, // trả lỗi nếu gửi field lạ
    transform: true,       // tự cast type (string → number...)
  }));

  // credentials: true → cho phép browser gửi cookie cross-origin
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(3001);
  console.log('Backend chạy tại http://localhost:3001');
}
bootstrap();
