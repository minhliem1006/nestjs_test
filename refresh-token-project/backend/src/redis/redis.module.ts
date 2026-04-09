import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global() // Inject RedisService ở bất kỳ module nào mà không cần import lại
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          lazyConnect: true, // Không throw lỗi ngay khi khởi động nếu Redis chưa sẵn sàng
        }),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
