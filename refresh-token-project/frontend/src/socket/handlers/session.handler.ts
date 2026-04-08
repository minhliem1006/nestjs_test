import { getSocket } from '../../api/socket';
import { clearAccessToken } from '../../api/tokenManager';

// Global handlers — đăng ký 1 lần trong SocketContext
export const registerSessionHandlers = () => {
  const socket = getSocket();
  if (!socket) return;

  // Bị thu hồi session từ thiết bị khác (đổi mật khẩu + revokeAll)
  socket.on('SESSION_REVOKED', () => {
    clearAccessToken();
    localStorage.removeItem('user');
    window.location.href = '/login?reason=session_revoked';
  });

  // NEW_LOGIN không phải global → để từng page tự lắng nghe bằng useSocketEvent
};
