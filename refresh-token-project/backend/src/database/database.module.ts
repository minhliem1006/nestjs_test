import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global() // Dùng được ở mọi module mà không cần import lại
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('DB_HOST'),
        port:     config.get<number>('DB_PORT'),
        database: config.get('DB_NAME'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        autoLoadEntities: true, // Tự load entity từ forFeature() của từng module
        synchronize: true,      // Dev only: tự tạo/cập nhật table từ entity
      }),
    }),
  ],
})
export class DatabaseModule {}
