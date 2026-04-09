import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { RefreshToken, RevokedReason } from './entities/refresh-token.entity';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
    private readonly redis: RedisService,
  ) {}

  // ─── HASH TOKEN ─────────────────────────────────────────────────────────────
  // Lưu hash thay vì raw token — nếu DB/Redis bị leak, attacker không có token thật
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ─── LƯU TOKEN ──────────────────────────────────────────────────────────────
  async storeToken(token: string, userId: number, ip: string): Promise<void> {
    const hash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

    // Ghi vào Redis (fast lookup)
    await this.redis.set(`token:${hash}`, String(userId), TOKEN_TTL_SECONDS);

    // Ghi hash vào Set của user (để revokeAll không cần scan toàn bộ Redis)
    await this.redis.sadd(`user_tokens:${userId}`, hash);

    // Ghi vào PostgreSQL (audit trail + durability)
    await this.repo.save({ userId, tokenHash: hash, ip, expiresAt, revokedAt: null, revokedReason: null });

    this.logger.log(`[TOKEN_STORED] userId=${userId} ip=${ip}`);
  }

  // ─── VALIDATE TOKEN ──────────────────────────────────────────────────────────
  // Check Redis trước (fast) → nếu miss, check PG → self-healing cache
  async validateToken(token: string): Promise<number | null> {
    const hash = this.hashToken(token);

    // 1. Check Redis
    const cached = await this.redis.get(`token:${hash}`);
    if (cached) {
      return parseInt(cached, 10);
    }

    // 2. Cache miss (Redis bị restart?) → check PostgreSQL
    const record = await this.repo.findOne({
      where: { tokenHash: hash, revokedAt: IsNull() },
    });

    if (!record || record.expiresAt < new Date()) {
      return null; // Token không tồn tại hoặc đã hết hạn
    }

    // 3. Self-healing: re-populate Redis
    const ttlLeft = Math.floor((record.expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.set(`token:${hash}`, String(record.userId), ttlLeft);
    await this.redis.sadd(`user_tokens:${record.userId}`, hash);
    this.logger.log(`[TOKEN_CACHE_HEAL] userId=${record.userId}`);

    return record.userId;
  }

  // ─── REVOKE TOKEN ────────────────────────────────────────────────────────────
  async revokeToken(token: string, reason: RevokedReason, ip: string, userId?: number): Promise<void> {
    const hash = this.hashToken(token);

    // Xóa khỏi Redis
    await this.redis.del(`token:${hash}`);

    // Xóa khỏi user Set (nếu biết userId)
    if (userId) {
      await this.redis.srem(`user_tokens:${userId}`, hash);
    }

    // Đánh dấu revoked trong PostgreSQL
    await this.repo.update(
      { tokenHash: hash, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );

    this.logger.log(`[TOKEN_REVOKED] reason=${reason} ip=${ip}`);
  }

  // ─── REVOKE TẤT CẢ TOKEN CỦA USER (trừ 1 token hiện tại) ───────────────────
  // Dùng user_tokens:{userId} Set — tránh O(N) KEYS scan
  async revokeAllTokensForUser(
    userId: number,
    exceptToken: string, // token của session hiện tại — không bị revoke
    reason: RevokedReason,
    ip: string,
  ): Promise<void> {
    // Hash token hiện tại để so sánh (bỏ qua khi duyệt)
    const exceptHash = this.hashToken(exceptToken);

    // Lấy tất cả hash token của user từ Redis Set
    // Dùng Set thay vì KEYS scan → nhanh O(1) thay vì O(N)
    const hashes = await this.redis.smembers(`user_tokens:${userId}`);

    for (const hash of hashes) {
      // Bỏ qua token hiện tại — không tự logout session đang dùng
      if (hash === exceptHash) continue;

      // Xóa token khỏi Redis (vô hiệu hóa ngay lập tức)
      await this.redis.del(`token:${hash}`);

      // Xóa hash khỏi Set của user
      await this.redis.srem(`user_tokens:${userId}`, hash);

      // Đánh dấu revoked trong PostgreSQL (audit trail)
      await this.repo.update(
        { tokenHash: hash, revokedAt: IsNull() },
        { revokedAt: new Date(), revokedReason: reason },
      );
    }

    // Fallback: revoke trong PG những token không có trong Redis Set
    // Trường hợp: Redis bị restart → Set bị mất → PG vẫn còn token chưa revoke
    await this.repo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('user_id = :userId AND token_hash != :exceptHash AND revoked_at IS NULL', { userId, exceptHash })
      .execute();

    this.logger.log(`[TOKEN_REVOKE_ALL] userId=${userId} reason=${reason} ip=${ip}`);
  }
}
