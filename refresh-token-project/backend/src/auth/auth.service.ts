import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SessionGateway } from './session.gateway';
import { TokenService } from '../token/token.service';
import { RevokedReason } from '../token/entities/refresh-token.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionGateway: SessionGateway,
    private tokenService: TokenService,
    private auditService: AuditService,
  ) {
    this.ACCESS_SECRET  = this.configService.get<string>('JWT_ACCESS_SECRET');
    this.REFRESH_SECRET = this.configService.get<string>('JWT_REFRESH_SECRET');
  }

  // ─── ĐĂNG KÝ ────────────────────────────────────────────────────────────────
  async register(username: string, password: string, name: string, ip: string) {
    const existing = this.usersService.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username đã tồn tại');
    }

    const user = this.usersService.create(username, password, name);
    this.logger.log(`[REGISTER] userId=${user.id} username=${username}`);

    await this.auditService.log({ action: AuditAction.REGISTER, ip, userId: user.id, metadata: { username } });

    return { message: 'Đăng ký thành công', user: { id: user.id, name: user.name, role: user.role } };
  }

  // ─── ĐĂNG NHẬP ──────────────────────────────────────────────────────────────
  async login(username: string, password: string, ip: string) {
    const user = this.usersService.findByUsername(username);
    if (!user || user.password !== password) {
      this.logger.warn(`[LOGIN_FAILED] username=${username} ip=${ip}`);
      await this.auditService.log({ action: AuditAction.LOGIN_FAILED, ip, metadata: { username } });
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }

    const tokens = this.generateTokens(user.id, user.username, user.role);

    // Thông báo các session đang online trước khi lưu token mới
    this.sessionGateway.notifyNewLogin(user.id, { ip, time: new Date().toLocaleTimeString('vi-VN') });

    // Lưu refresh token vào Redis + PostgreSQL
    await this.tokenService.storeToken(tokens.refreshToken, user.id, ip);

    await this.auditService.log({ action: AuditAction.LOGIN_SUCCESS, ip, userId: user.id });
    this.logger.log(`[LOGIN] userId=${user.id} username=${username} ip=${ip}`);

    return { ...tokens, user: { id: user.id, name: user.name, role: user.role } };
  }

  // ─── LÀM MỚI TOKEN (REFRESH) ────────────────────────────────────────────────
  async refresh(refreshToken: string, ip: string) {
    try {
      // Verify JWT signature trước
      const payload = this.jwtService.verify(refreshToken, { secret: this.REFRESH_SECRET });

      // Check token có tồn tại và chưa bị revoke không (Redis → PG)
      const userId = await this.tokenService.validateToken(refreshToken);
      if (!userId) {
        this.logger.warn(`[REFRESH_UNKNOWN] userId=${payload.sub} ip=${ip}`);
        await this.auditService.log({ action: AuditAction.REFRESH_FAILED, ip, userId: payload.sub, metadata: { reason: 'token_not_found' } });
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      if (userId !== payload.sub) {
        this.logger.warn(`[REFRESH_REUSE] userId=${payload.sub} ip=${ip} → có thể bị tấn công`);
        await this.auditService.log({ action: AuditAction.REFRESH_FAILED, ip, userId: payload.sub, metadata: { reason: 'reuse_detected' } });
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const user = this.usersService.findById(userId);
      if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

      // Rotate: revoke token cũ → tạo token mới
      await this.tokenService.revokeToken(refreshToken, RevokedReason.EXPIRED, ip, userId);
      const tokens = this.generateTokens(user.id, user.username, user.role);
      await this.tokenService.storeToken(tokens.refreshToken, user.id, ip);

      this.sessionGateway.notifyTokenRefreshed(user.id, { ip, time: new Date().toLocaleTimeString('vi-VN') });
      await this.auditService.log({ action: AuditAction.REFRESH_SUCCESS, ip, userId: user.id });
      this.logger.log(`[REFRESH] userId=${user.id} ip=${ip}`);

      return tokens;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`[REFRESH_FAILED] ip=${ip} reason=${(err as Error).message}`);
      throw new UnauthorizedException('Refresh token hết hạn hoặc không hợp lệ');
    }
  }

  // ─── ĐĂNG XUẤT ──────────────────────────────────────────────────────────────
  async logout(refreshToken: string, ip: string) {
    // Lấy userId từ token để log (best effort)
    const userId = await this.tokenService.validateToken(refreshToken);
    await this.tokenService.revokeToken(refreshToken, RevokedReason.LOGOUT, ip, userId ?? undefined);
    await this.auditService.log({ action: AuditAction.LOGOUT, ip, userId: userId ?? undefined });
    this.logger.log(`[LOGOUT] userId=${userId ?? 'unknown'} ip=${ip}`);
    return { message: 'Đăng xuất thành công' };
  }

  // ─── ĐỔI MẬT KHẨU ───────────────────────────────────────────────────────────
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
    revokeAll: boolean,
    currentRefreshToken: string,
    currentSocketId: string,
    ip: string,
  ) {
    const user = this.usersService.findById(userId);
    if (!user || user.password !== oldPassword) {
      this.logger.warn(`[CHANGE_PASSWORD_FAILED] userId=${userId} ip=${ip}`);
      throw new UnauthorizedException('Mật khẩu cũ không đúng');
    }

    this.usersService.updatePassword(userId, newPassword);
    this.logger.log(`[CHANGE_PASSWORD] userId=${userId} revokeAll=${revokeAll} ip=${ip}`);

    if (revokeAll) {
      await this.tokenService.revokeAllTokensForUser(userId, currentRefreshToken, RevokedReason.PASSWORD_CHANGE, ip);
      this.sessionGateway.revokeUserSessions(userId, currentSocketId);
    }

    await this.auditService.log({ action: AuditAction.CHANGE_PASSWORD, ip, userId, metadata: { revokeAll } });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ─── TẠO CẶP TOKEN ──────────────────────────────────────────────────────────
  private generateTokens(userId: number, username: string, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, username, role },
      { secret: this.ACCESS_SECRET, expiresIn: '15s' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: this.REFRESH_SECRET, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }
}
