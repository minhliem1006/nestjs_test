import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule, // phải trước các feature module dùng TypeORM
    RedisModule,    // global, inject RedisService ở bất kỳ đâu
    AuthModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  // configure() dùng để đăng ký middleware — không thể dùng useGlobalMiddleware như Filter/Interceptor
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // áp dụng cho tất cả route
  }
}
