import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './tokenManager';

let socket: Socket | null = null;

export const connectSocket = () => {
  const token = getAccessToken();
  if (!token || socket?.connected) return;
  socket = io(import.meta.env.VITE_API_URL, {
    auth: { token },
  });
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
export const getSocketId = (): string => socket?.id ?? '';
