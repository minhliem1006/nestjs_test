import { useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';

// Hook dùng trong component để lắng nghe socket event
// - Dùng socket từ Context → đảm bảo socket đã sẵn sàng (không bị null)
// - Dùng ref cho handler → tránh đăng ký/hủy liên tục khi component re-render
// - Tự cleanup khi component unmount

export const useSocketEvent = (event: string, handler: (...args: any[]) => void) => {
  const { socket } = useSocket();

  // Giữ handler luôn mới nhất mà không cần đưa vào deps của useEffect
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return; // socket chưa sẵn sàng → bỏ qua, chờ re-render

    // Dùng stable handler qua ref → socket.on/off chỉ chạy 1 lần khi socket sẵn sàng
    const stableHandler = (...args: any[]) => handlerRef.current(...args);

    socket.on(event, stableHandler);

    return () => {
      socket.off(event, stableHandler); // cleanup khi unmount hoặc event thay đổi
    };
  }, [socket, event]); // socket từ Context → re-run khi socket sẵn sàng
};
