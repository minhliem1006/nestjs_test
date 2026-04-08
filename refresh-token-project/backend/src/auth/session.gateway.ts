import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: { origin: 'http://localhost:5173', credentials: true },
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(SessionGateway.name);

  // userId → Set<socketId> (1 user có thể có nhiều thiết bị)
  private userSockets = new Map<number, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Gọi khi FE kết nối WebSocket
  handleConnection(client: Socket) {
    try {
      // FE gửi accessToken qua handshake.auth
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // Lưu userId vào socket để dùng khi disconnect
      client.data.userId = payload.sub;

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub).add(client.id);

      this.logger.log(`[WS_CONNECT] userId=${payload.sub} socketId=${client.id}`);
    } catch {
      // Token không hợp lệ → ngắt kết nối
      client.disconnect();
    }
  }

  // Gọi khi FE ngắt kết nối (đóng tab, logout...)
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      this.logger.log(`[WS_DISCONNECT] userId=${userId} socketId=${client.id}`);
    }
  }

  // Gửi SESSION_REVOKED đến tất cả socket của user, trừ socket hiện tại
  revokeUserSessions(userId: number, exceptSocketId?: string) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.forEach((socketId) => {
      if (socketId !== exceptSocketId) {
        this.server.to(socketId).emit('SESSION_REVOKED');
        this.logger.log(`[WS_REVOKE] userId=${userId} socketId=${socketId}`);
      }
    });
  }

  // Thông báo các session đang online rằng có thiết bị mới vừa đăng nhập
  notifyNewLogin(userId: number, info: { ip: string; time: string }) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('NEW_LOGIN', info);
      this.logger.log(`[WS_NEW_LOGIN] userId=${userId} socketId=${socketId}`);
    });
  }

  // Thông báo tất cả session của user khi có bất kỳ session nào refresh token
  notifyTokenRefreshed(userId: number, info: { ip: string; time: string }) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('TOKEN_REFRESHED', info);
    });
  }
}
