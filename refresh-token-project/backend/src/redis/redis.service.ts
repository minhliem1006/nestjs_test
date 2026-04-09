import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  // Lưu key → value với TTL (giây)
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  // Lấy value theo key — trả null nếu không tồn tại / hết hạn
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // Xóa key
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Thêm member vào Redis Set
  async sadd(key: string, member: string): Promise<void> {
    await this.client.sadd(key, member);
  }

  // Lấy tất cả member của Redis Set
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  // Xóa member khỏi Redis Set
  async srem(key: string, member: string): Promise<void> {
    await this.client.srem(key, member);
  }
}
