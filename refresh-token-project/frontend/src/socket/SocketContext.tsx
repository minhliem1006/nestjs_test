import { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket, getSocketId as _getSocketId } from '../api/socket';
import { registerSessionHandlers } from './handlers/session.handler';

interface SocketContextType {
  socket: Socket | null;         // expose socket để useSocketEvent dùng
  getSocketId: () => string;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  getSocketId: () => '',
  isConnected: false,
  emit: () => {},
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  // Lưu socket vào state để child component biết khi socket sẵn sàng
  // → useSocketEvent phụ thuộc vào socket state
  // → khi socket được tạo, useSocketEvent tự động đăng ký handler
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    connectSocket();
    registerSessionHandlers();

    const s = getSocket();
    if (!s) return;

    setSocket(s); // ← trigger re-render child, useSocketEvent chạy lại với socket

    s.on('connect', () => { setIsConnected(true); });
    s.on('disconnect', () => { setIsConnected(false); });

    return () => {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  const emit = (event: string, data?: any) => socket?.emit(event, data);

  return (
    <SocketContext.Provider value={{ socket, getSocketId: _getSocketId, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
