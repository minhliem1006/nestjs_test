import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: string;
}

// let thay vì const để có thể cập nhật password
const MOCK_USERS: User[] = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin' },
  { id: 2, username: 'user',  password: 'user123',  name: 'Regular User', role: 'user' },
];

@Injectable()
export class UsersService {
  findByUsername(username: string): User | undefined {
    return MOCK_USERS.find((u) => u.username === username);
  }

  findById(id: number): User | undefined {
    return MOCK_USERS.find((u) => u.id === id);
  }

  // Cập nhật password — thực tế sẽ UPDATE vào DB
  updatePassword(userId: number, newPassword: string): boolean {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (!user) return false;
    user.password = newPassword;
    return true;
  }
}
