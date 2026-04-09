import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog } from './entities/audit-log.entity';

export interface AuditQuery {
  userId?: number;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  // Lấy danh sách audit log — dùng cho trang admin
  async findAll(query: AuditQuery = {}): Promise<{ data: AuditLog[]; total: number }> {
    const { userId, action, limit = 20, offset = 0 } = query;

    const qb = this.repo.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (action) qb.andWhere('log.action = :action', { action });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // Ghi 1 dòng audit log — KHÔNG BAO GIỜ throw
  // Audit là side effect, không được làm fail main operation
  async log(params: {
    action: AuditAction;
    ip: string;
    userId?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.repo.save({
        action:   params.action,
        ip:       params.ip,
        userId:   params.userId ?? null,
        metadata: params.metadata ?? null,
      });
    } catch (err) {
      // Log lỗi nhưng không propagate — main operation vẫn tiếp tục
      this.logger.error(`[AUDIT_FAIL] action=${params.action} err=${(err as Error).message}`);
    }
  }
}
