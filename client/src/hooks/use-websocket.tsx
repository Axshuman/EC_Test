import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
import { createValidWebSocketUrl } from "@/lib/websocket-utils";

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionAttempts: number;
  sendMessage: (type: string, data: any) => void;
  lastMessage: any;
  forceReconnect: () => void;
}

const WebSocketContext = createContext<SocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const messageQueueRef = useRef<any[]>([]);
  const isConnectingRef = useRef(false);

  const connect = () => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current || !shouldConnectRef.current) {
      return;
    }
    
    const token = getAuthToken();
    if (!token) {
      setTimeout(connect, 2000);
      return;
    }

    // Prevent connecting if already connected
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionAttempts(prev => prev + 1);

    try {
      const host = window.location.host;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
      
      console.log('🔗 WebSocket connecting to:', wsUrl);
      
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;

      newSocket.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
        setSocket(newSocket);
        setConnectionAttempts(0);
        
        // Send queued messages
        if (messageQueueRef.current.length > 0) {
          const queue = [...messageQueueRef.current];
          messageQueueRef.current = [];
          queue.forEach(msg => {
            try {
              newSocket.send(JSON.stringify(msg));
            } catch (error) {
              messageQueueRef.current.push(msg);
            }
          });
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'pong') {
            console.log('📥 Message received:', data);
            setLastMessage({ ...data, timestamp: Date.now() });
          }
        } catch (error) {
          console.warn('Message parse error:', error);
          setLastMessage({ 
            type: 'parse_error', 
            rawData: event.data, 
            timestamp: Date.now() 
          });
        }
      };

      newSocket.onerror = (error) => {
        console.warn('⚠️ WebSocket error:', error);
      };

      newSocket.onclose = (event) => {
        console.log(`🔌 WebSocket closed (${event.code})`);
        setIsConnected(false);
        setIsConnecting(false);
        isConnectingRef.current = false;
        setSocket(null);
        
        // Clear any existing timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Reconnect if should connect and not a normal closure
        if (shouldConnectRef.current && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(1.5, connectionAttempts), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnectRef.current) {
              connect();
            }
          }, delay);
        }
      };

    } catch (error) {
      console.error('❌ Connection failed:', error);
      setIsConnecting(false);
      isConnectingRef.current = false;
      
      // Retry connection
      if (shouldConnectRef.current) {
        const delay = Math.min(1000 * Math.pow(1.5, connectionAttempts), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (shouldConnectRef.current) {
            connect();
          }
        }, delay);
      }
    }
  };

  const forceReconnect = () => {
    console.log('🔄 Force reconnect');
    setConnectionAttempts(0);
    if (socketRef.current) {
      socketRef.current.close();
    } else {
      connect();
    }
  };

  const sendMessage = (type: string, data: any) => {
    const message = { type, data };
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        messageQueueRef.current.push(message);
        return false;
      }
    } else {
      messageQueueRef.current.push(message);
      if (!isConnecting && shouldConnectRef.current) {
        setTimeout(connect, 100);
      }
      return false;
    }
  };

  // Initialize connection only once
  useEffect(() => {
    shouldConnectRef.current = true;
    
    // Small delay to prevent immediate execution
    const timeout = setTimeout(() => {
      if (shouldConnectRef.current) {
        connect();
      }
    }, 200);

    return () => {
      shouldConnectRef.current = false;
      isConnectingRef.current = false;
      clearTimeout(timeout);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []); // Empty deps to run only once

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    connectionAttempts,
    sendMessage,
    lastMessage,
    forceReconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): SocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    return {
      socket: null,
      isConnected: false,
      isConnecting: false,
      connectionAttempts: 0,
      sendMessage: () => false,
      lastMessage: null,
      forceReconnect: () => {}
    };
  }
  return context;
}