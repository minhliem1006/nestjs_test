import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Đọc metadata 'roles' được gắn bởi @Roles() decorator
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    // Không có @Roles() → không giới hạn role → cho qua
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException(`Chỉ ${requiredRoles.join(', ')} mới có quyền truy cập`);
    }

    return true;
  }
}
