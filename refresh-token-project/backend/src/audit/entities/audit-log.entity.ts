import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  LOGIN_SUCCESS    = 'LOGIN_SUCCESS',
  LOGIN_FAILED     = 'LOGIN_FAILED',
  LOGOUT           = 'LOGOUT',
  REFRESH_SUCCESS  = 'REFRESH_SUCCESS',
  REFRESH_FAILED   = 'REFRESH_FAILED',
  REGISTER         = 'REGISTER',
  CHANGE_PASSWORD  = 'CHANGE_PASSWORD',
  SESSION_REVOKED  = 'SESSION_REVOKED',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_audit_log_user_id')
  @Column({ name: 'user_id', nullable: true })
  userId: number | null; // nullable vì login thất bại chưa có userId

  @Index('idx_audit_log_action')
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ length: 45 })
  ip: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // dữ liệu thêm: socketId, username thử, lý do...

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
