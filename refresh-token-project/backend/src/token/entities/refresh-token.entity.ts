import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum RevokedReason {
  LOGOUT           = 'logout',
  PASSWORD_CHANGE  = 'password_change',
  EXPIRED          = 'expired',
  REUSE_DETECTED   = 'reuse_detected',
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_refresh_token_user_id')
  @Column({ name: 'user_id' })
  userId: number;

  @Index('idx_refresh_token_hash')
  @Column({ name: 'token_hash', length: 64 })
  tokenHash: string;

  @Column({ length: 45 }) // 45 ký tự cover IPv6
  ip: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  revokedAt: Date | null;

  @Column({
    name: 'revoked_reason',
    type: 'enum',
    enum: RevokedReason,
    nullable: true,
  })
  revokedReason: RevokedReason | null;
}
