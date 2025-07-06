import { createContext, useContext, useEffect, useState, ReactNode, createElement } from 'react';
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/auth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<SocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    // Initialize Socket.IO connection
    const newSocket = io({
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
    });

    // Listen for all real-time events
    newSocket.onAny((eventName, data) => {
      setLastMessage({ event: eventName, data });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = (event: string, data: any) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    sendMessage,
    lastMessage,
  };

  return createElement(WebSocketContext.Provider, { value: contextValue }, children);
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}