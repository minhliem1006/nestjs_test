import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenService } from './token.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
