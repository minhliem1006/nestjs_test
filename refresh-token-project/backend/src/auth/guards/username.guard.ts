import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class UsernameGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // NestJS gọi hàm này mỗi khi có request vào route được bảo vệ
  // trả true → cho qua | trả false / throw → chặn
  canActivate(context: ExecutionContext): boolean {
    // Đọc metadata key 'requiredUsername' được ghi bởi @RequireUsername('liem') lúc khởi động
    // → kết quả là 'liem' (hoặc undefined nếu route không dùng @RequireUsername)
    const requiredUsername = this.reflector.get<string>('requiredUsername', context.getHandler());

    // Route không có @RequireUsername → không giới hạn username → cho qua
    if (!requiredUsername) return true;

    // Lấy req.user đã được JwtAuthGuard gán trước đó: { userId, username, role }
    const { user } = context.switchToHttp().getRequest();

    // So sánh username đang đăng nhập với username yêu cầu → không khớp thì chặn 403
    if (user?.username !== requiredUsername) {
      throw new ForbiddenException(`Chỉ user "${requiredUsername}" mới truy cập được`);
    }

    // Khớp → cho request đi tiếp vào handler
    return true;
  }
}
