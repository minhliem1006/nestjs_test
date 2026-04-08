import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService], // đăng ký UsersService trong module này
  exports: [UsersService],   // export ra để AuthModule có thể dùng
})
export class UsersModule {}
