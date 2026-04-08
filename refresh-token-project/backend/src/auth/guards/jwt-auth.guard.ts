import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard này bảo vệ các route cần xác thực
// Khi dùng @UseGuards(JwtAuthGuard) trên một route:
//   1. Guard lấy Bearer token từ header Authorization
//   2. Gọi JwtStrategy để verify token
//   3. Nếu hợp lệ → cho phép tiếp tục, req.user được gán giá trị từ JwtStrategy.validate()
//   4. Nếu không hợp lệ → trả về 401 Unauthorized ngay lập tức

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 'jwt' tương ứng với tên strategy trong JwtStrategy (PassportStrategy(Strategy))
  // Passport tự biết dùng JwtStrategy khi thấy tên 'jwt'
}
