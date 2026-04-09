import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

// Route: GET /audit/logs?limit=20&offset=0&action=LOGIN_SUCCESS
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('logs')
  getLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findAll({
      limit:  limit  ? parseInt(limit)  : 20,
      offset: offset ? parseInt(offset) : 0,
      action: action as any,
    });
  }
}
