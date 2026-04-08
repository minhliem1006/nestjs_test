import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SessionGateway } from './session.gateway';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private refreshTokenStore = new Map<string, number>(); // token → userId

  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionGateway: SessionGateway,
  ) {
    this.ACCESS_SECRET  = this.configService.get<string>('JWT_ACCESS_SECRET');
    this.REFRESH_SECRET = this.configService.get<string>('JWT_REFRESH_SECRET');
  }

  // ─── ĐĂNG NHẬP ──────────────────────────────────────────────────────────────
  async login(username: string, password: string, ip: string) {
    const user = this.usersService.findByUsername(username);
    if (!user || user.password !== password) {
      this.logger.warn(`[LOGIN_FAILED] username=${username} ip=${ip}`);
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }

    const tokens = this.generateTokens(user.id, user.username, user.role);

    // Thông báo các session đang online trước khi lưu token mới
    this.sessionGateway.notifyNewLogin(user.id, {
      ip,
      time: new Date().toLocaleTimeString('vi-VN'),
    });

    this.refreshTokenStore.set(tokens.refreshToken, user.id);
    this.logger.log(`[LOGIN] userId=${user.id} username=${username} ip=${ip}`);

    return {
      ...tokens,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  // ─── LÀM MỚI TOKEN (REFRESH) ────────────────────────────────────────────────
  async refresh(refreshToken: string, ip: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: this.REFRESH_SECRET });
      const userId = this.refreshTokenStore.get(refreshToken);

      if (!userId) {
        this.logger.warn(`[REFRESH_UNKNOWN] userId=${payload.sub} ip=${ip} → có thể do server restart`);
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      if (userId !== payload.sub) {
        this.logger.warn(`[REFRESH_REUSE] userId=${payload.sub} ip=${ip} → có thể bị tấn công`);
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const user = this.usersService.findById(userId);
      if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

      this.refreshTokenStore.delete(refreshToken);
      const tokens = this.generateTokens(user.id, user.username, user.role);
      this.refreshTokenStore.set(tokens.refreshToken, user.id);
      this.sessionGateway.notifyTokenRefreshed(user.id, {
        ip,
        time: new Date().toLocaleTimeString('vi-VN'),
      });
      this.logger.log(`[REFRESH] userId=${user.id} ip=${ip}`);

      return tokens;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`[REFRESH_FAILED] ip=${ip} reason=${(err as Error).message}`);
      throw new UnauthorizedException('Refresh token hết hạn hoặc không hợp lệ');
    }
  }

  // ─── ĐĂNG XUẤT ──────────────────────────────────────────────────────────────
  logout(refreshToken: string, ip: string) {
    const userId = this.refreshTokenStore.get(refreshToken);
    this.refreshTokenStore.delete(refreshToken);
    this.logger.log(`[LOGOUT] userId=${userId ?? 'unknown'} ip=${ip}`);
    return { message: 'Đăng xuất thành công' };
  }

  // ─── ĐỔI MẬT KHẨU ───────────────────────────────────────────────────────────
  // revokeAll: true  → thu hồi tất cả session khác, push SESSION_REVOKED qua WS
  // revokeAll: false → chỉ đổi password, giữ nguyên tất cả session
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
    revokeAll: boolean,
    currentRefreshToken: string, // giữ lại session này
    currentSocketId: string,     // giữ lại socket này
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
      // Xóa tất cả refreshToken của user trừ session hiện tại
      this.revokeAllTokensExcept(userId, currentRefreshToken);
      // Push SESSION_REVOKED đến các thiết bị khác qua WebSocket
      this.sessionGateway.revokeUserSessions(userId, currentSocketId);
    }

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ─── THU HỒI TẤT CẢ TOKEN TRỪ SESSION HIỆN TẠI ────────────────────────────
  private revokeAllTokensExcept(userId: number, keepToken: string) {
    for (const [token, id] of this.refreshTokenStore) {
      if (id === userId && token !== keepToken) {
        this.refreshTokenStore.delete(token);
      }
    }
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
