import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Đọc cookie từ request (cần để đọc refreshToken cookie)
  app.use(cookieParser());

  // credentials: true → cho phép browser gửi cookie cross-origin
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(3001);
  console.log('Backend chạy tại http://localhost:3001');
}
bootstrap();
