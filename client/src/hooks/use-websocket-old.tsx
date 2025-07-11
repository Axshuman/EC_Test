import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
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
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const messageQueueRef = useRef<any[]>([]);
  const currentReconnectIntervalRef = useRef(1000);
  const isConnectingRef = useRef(false);

  // Robust connection configuration
  const maxReconnectAttempts = Infinity;
  const reconnectInterval = 500;
  const maxReconnectInterval = 5000;
  const reconnectDecay = 1.1;
  const heartbeatInterval = 20000;
  const connectionTimeout = 6000;

  // Remove all the complex callback dependencies that were causing loops

  const connectInternal = useCallback(() => {
    if (!shouldConnectRef.current || isConnectingRef.current) return;
    
    const token = getAuthToken();
    if (!token) {
      console.warn('No token, retrying in 2 seconds...');
      setTimeout(() => {
        if (shouldConnectRef.current) connectInternal();
      }, 2000);
      return;
    }

    // Prevent multiple connections
    if (socketRef.current?.readyState === WebSocket.CONNECTING || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Connection already exists, skipping');
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionAttempts(prev => prev + 1);

    try {
      const wsUrl = createValidWebSocketUrl(window.location.host, token);
      console.log(`🚀 Creating WebSocket connection to: ${wsUrl}`);
      
      const newSocket = new WebSocket(wsUrl);
      newSocket.binaryType = 'arraybuffer';
      socketRef.current = newSocket;

      newSocket.onopen = () => {
        console.log('🔗 WebSocket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
        setConnectionAttempts(0);
        setSocket(newSocket);
        currentReconnectIntervalRef.current = reconnectInterval;
        clearTimeout(connectionTimeoutRef.current!);
        
        // Process queued messages
        if (messageQueueRef.current.length > 0) {
          const queue = [...messageQueueRef.current];
          messageQueueRef.current = [];
          queue.forEach(message => {
            try {
              newSocket.send(JSON.stringify(message));
            } catch (error) {
              messageQueueRef.current.push(message);
            }
          });
        }
        
        // Start heartbeat
        clearTimeout(heartbeatTimeoutRef.current!);
        heartbeatTimeoutRef.current = setTimeout(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            try {
              newSocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            } catch (error) {
              console.warn('Heartbeat failed:', error);
            }
          }
        }, heartbeatInterval);
      };

      newSocket.onmessage = (event) => {
        try {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            data = { type: 'raw', data: event.data, timestamp: Date.now() };
          }

          if (data.type === 'pong') {
            console.log('💓 Heartbeat response');
            // Schedule next heartbeat
            clearTimeout(heartbeatTimeoutRef.current!);
            heartbeatTimeoutRef.current = setTimeout(() => {
              if (newSocket.readyState === WebSocket.OPEN) {
                try {
                  newSocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                } catch (error) {
                  console.warn('Heartbeat failed:', error);
                }
              }
            }, heartbeatInterval);
            return;
          }

          console.log('📥 Message received:', data);
          setLastMessage({ ...data, timestamp: Date.now() });
        } catch (error) {
          console.warn('Message processing error:', error);
          setLastMessage({ type: 'error', rawData: String(event.data), error: String(error), timestamp: Date.now() });
        }
      };

      newSocket.onerror = (error) => {
        console.warn('⚠️ WebSocket error:', error);
      };

      newSocket.onclose = (event) => {
        console.log(`🔌 Connection closed (code: ${event.code})`);
        setIsConnected(false);
        setIsConnecting(false);
        isConnectingRef.current = false;
        setSocket(null);
        clearTimeout(connectionTimeoutRef.current!);
        clearTimeout(heartbeatTimeoutRef.current!);
        
        if (shouldConnectRef.current) {
          const nextInterval = Math.min(
            currentReconnectIntervalRef.current * reconnectDecay,
            maxReconnectInterval
          );
          console.log(`🚀 Reconnecting in ${nextInterval}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnectRef.current) connectInternal();
          }, nextInterval);
          currentReconnectIntervalRef.current = nextInterval;
        }
      };

      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (newSocket.readyState === WebSocket.CONNECTING) {
          console.warn('⏰ Connection timeout');
          newSocket.close();
        }
      }, connectionTimeout);

    } catch (error) {
      console.error('❌ Connection creation failed:', error);
      setIsConnecting(false);
      isConnectingRef.current = false;
      setLastMessage({ type: 'connection_failed', error: String(error), timestamp: Date.now() });
      setTimeout(() => {
        if (shouldConnectRef.current) connectInternal();
      }, currentReconnectIntervalRef.current);
    }
  }, []);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnect triggered');
    setConnectionAttempts(0);
    currentReconnectIntervalRef.current = reconnectInterval;
    
    if (socketRef.current) {
      socketRef.current.close();
    } else if (!isConnectingRef.current) {
      connectInternal();
    }
  }, [connectInternal]);

  // INITIAL CONNECTION + CLEANUP - Only run once
  useEffect(() => {
    shouldConnectRef.current = true;
    connectInternal();

    return () => {
      shouldConnectRef.current = false;
      clearTimeout(reconnectTimeoutRef.current!);
      clearTimeout(heartbeatTimeoutRef.current!);
      clearTimeout(connectionTimeoutRef.current!);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []); // Empty dependency array to prevent infinite loops

  // Simple auto-reconnect triggers without complex dependencies
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && !isConnectingRef.current) {
        console.log('👁️ Tab visible - checking connection...');
        forceReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, forceReconnect]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network online - checking connection...');
      if (!isConnected && !isConnectingRef.current) forceReconnect();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isConnected, forceReconnect]);

  const sendMessage = useCallback((type: string, data: any) => {
    const message = { type, data };
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        console.log('📤 Message sent successfully');
        return true;
      } catch (error) {
        console.warn('❌ Send failed, queuing message:', error);
        messageQueueRef.current.push(message);
        return false;
      }
    } else {
      console.log('📋 WebSocket not ready, queuing message');
      messageQueueRef.current.push(message);
      
      // If not connected, try to reconnect (debounced)
      if (!isConnected && !isConnecting && shouldConnectRef.current) {
        setTimeout(() => {
          if (!isConnected && !isConnecting && shouldConnectRef.current) {
            connectInternal();
          }
        }, 100);
      }
      
      return false;
    }
  }, [isConnected, isConnecting, connectInternal]);

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
      sendMessage: () => {},
      lastMessage: null,
      forceReconnect: () => {}
    };
  }
  return context;
}