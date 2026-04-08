import { SetMetadata } from '@nestjs/common';

// Gắn metadata 'roles' vào method → RolesGuard sẽ đọc ra
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
