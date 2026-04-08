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
  { id: 3, username: 'liem',  password: 'liem123',  name: 'Liem Ho', role: 'admin' },
];

let nextId = 3;

@Injectable()
export class UsersService {
  findByUsername(username: string): User | undefined {
    return MOCK_USERS.find((u) => u.username === username);
  }

  findById(id: number): User | undefined {
    return MOCK_USERS.find((u) => u.id === id);
  }

  // Tạo user mới — thực tế sẽ INSERT vào DB
  create(username: string, password: string, name: string): User {
    const user: User = { id: nextId++, username, password, name, role: 'user' };
    MOCK_USERS.push(user);
    return user;
  }

  // Cập nhật password — thực tế sẽ UPDATE vào DB
  updatePassword(userId: number, newPassword: string): boolean {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (!user) return false;
    user.password = newPassword;
    return true;
  }
}
