import { Body, Controller, Get, Post, Request, Response, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const getIp = (req: any): string =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Request() req: any,
    @Response({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.login(body.username, body.password, getIp(req));
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  async refresh(
    @Request() req: any,
    @Response({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.refresh(req.cookies['refreshToken'], getIp(req));
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  logout(
    @Request() req: any,
    @Response({ passthrough: true }) res: any,
  ) {
    this.authService.logout(req.cookies['refreshToken'], getIp(req));
    res.clearCookie('refreshToken');
    return { message: 'Đăng xuất thành công' };
  }

  // POST /auth/change-password — cần đăng nhập
  // Body: { oldPassword, newPassword, revokeAll, socketId }
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string; revokeAll: boolean; socketId: string },
    @Request() req: any,
  ) {
    return this.authService.changePassword(
      req.user.userId,
      body.oldPassword,
      body.newPassword,
      body.revokeAll,
      req.cookies['refreshToken'], // session hiện tại cần giữ lại
      body.socketId,               // socket hiện tại cần giữ lại
      getIp(req),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
