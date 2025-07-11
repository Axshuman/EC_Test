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
  const connectingRef = useRef(false);

  // Configuration
  const maxReconnectAttempts = Infinity;
  const reconnectInterval = 500;
  const maxReconnectInterval = 5000;
  const reconnectDecay = 1.1;
  const heartbeatInterval = 20000;
  const connectionTimeout = 6000;

  const clearAllTimeouts = () => {
    [reconnectTimeoutRef, heartbeatTimeoutRef, connectionTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  };

  const sendHeartbeat = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        console.log('💓 Heartbeat sent');
      } catch (error) {
        console.warn('Heartbeat failed, ignoring:', error);
      }
    }
  };

  const scheduleHeartbeat = () => {
    clearTimeout(heartbeatTimeoutRef.current!);
    heartbeatTimeoutRef.current = setTimeout(() => {
      sendHeartbeat();
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        scheduleHeartbeat();
      }
    }, heartbeatInterval);
  };

  const processMessageQueue = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      
      queue.forEach(message => {
        try {
          socketRef.current!.send(JSON.stringify(message));
          console.log('📤 Queued message sent');
        } catch (error) {
          messageQueueRef.current.push(message);
        }
      });
    }
  };

  const connect = () => {
    if (!shouldConnectRef.current || connectingRef.current) return;
    
    const token = getAuthToken();
    if (!token) {
      console.warn('No token, retrying in 2 seconds...');
      setTimeout(connect, 2000);
      return;
    }

    // Prevent multiple connections
    if (socketRef.current?.readyState === WebSocket.CONNECTING || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Connection already exists, skipping');
      return;
    }

    connectingRef.current = true;
    setIsConnecting(true);

    // Clean up existing connection
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (error) {
        console.warn('Cleanup error ignored:', error);
      }
    }

    setConnectionAttempts(prev => prev + 1);

    try {
      const wsUrl = createValidWebSocketUrl(window.location.host, token);
      console.log(`🚀 Creating single WebSocket connection`);
      
      const newSocket = new WebSocket(wsUrl);
      newSocket.binaryType = 'arraybuffer';
      socketRef.current = newSocket;

      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (newSocket.readyState === WebSocket.CONNECTING) {
          console.warn('⏰ Connection timeout - closing');
          newSocket.close();
        }
      }, connectionTimeout);

      newSocket.onopen = () => {
        console.log('🔗 WebSocket connected - NEVER DISCONNECT MODE ACTIVE');
        setIsConnected(true);
        setIsConnecting(false);
        connectingRef.current = false;
        setConnectionAttempts(0);
        setSocket(newSocket);
        currentReconnectIntervalRef.current = reconnectInterval;
        clearTimeout(connectionTimeoutRef.current!);
        processMessageQueue();
        scheduleHeartbeat();
      };

      newSocket.onmessage = (event) => {
        try {
          let data;
          
          try {
            data = JSON.parse(event.data);
          } catch (parseError1) {
            try {
              data = eval(`(${event.data})`);
            } catch (parseError2) {
              data = { raw: event.data, type: 'fallback', timestamp: Date.now() };
            }
          }

          if (data.type === 'pong') {
            console.log('💓 Heartbeat response');
            return;
          }

          console.log('📥 Message received (error-proof):', data);
          setLastMessage({ ...data, timestamp: Date.now() });
          
        } catch (error) {
          console.warn('Complete message processing failure, using emergency fallback');
          setLastMessage({ 
            type: 'emergency_fallback', 
            rawData: String(event.data), 
            error: String(error), 
            timestamp: Date.now() 
          });
        }
      };

      newSocket.onerror = (error) => {
        console.warn('⚠️ WebSocket error detected - IGNORING AND CONTINUING:', error);
        setLastMessage({ type: 'error_ignored', error: 'WebSocket error bypassed', timestamp: Date.now() });
      };

      newSocket.onclose = (event) => {
        console.log(`🔌 Connection lost - FORCE RECONNECTING (code: ${event.code})`);
        
        setIsConnected(false);
        setIsConnecting(false);
        connectingRef.current = false;
        setSocket(null);
        clearAllTimeouts();
        
        if (shouldConnectRef.current) {
          const nextInterval = Math.min(
            currentReconnectIntervalRef.current * reconnectDecay,
            maxReconnectInterval
          );
          
          console.log(`🚀 FORCE reconnecting in ${nextInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnectRef.current) {
              connect();
            }
          }, nextInterval);
          
          currentReconnectIntervalRef.current = nextInterval;
        }
      };

    } catch (error) {
      console.error('❌ Connection creation failed - RETRYING:', error);
      
      setIsConnecting(false);
      connectingRef.current = false;
      setLastMessage({ type: 'connection_failed', error: String(error), timestamp: Date.now() });

      setTimeout(connect, currentReconnectIntervalRef.current);
    }
  };

  const forceReconnect = useCallback(() => {
    console.log('🔄 FORCE RECONNECT TRIGGERED');
    setConnectionAttempts(0);
    currentReconnectIntervalRef.current = reconnectInterval;
    connectingRef.current = false;
    
    if (socketRef.current) {
      socketRef.current.close();
    } else {
      connect();
    }
  }, []);

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
      
      if (!isConnected && !isConnecting && shouldConnectRef.current) {
        setTimeout(() => {
          if (!connectingRef.current) {
            connect();
          }
        }, 100);
      }
      
      return false;
    }
  }, [isConnected, isConnecting]);

  // INITIAL CONNECTION - Only run once
  useEffect(() => {
    shouldConnectRef.current = true;
    
    const initTimeout = setTimeout(() => {
      if (!connectingRef.current) {
        connect();
      }
    }, 100);

    return () => {
      shouldConnectRef.current = false;
      connectingRef.current = false;
      clearTimeout(initTimeout);
      clearAllTimeouts();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Auto-reconnect on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && !isConnecting) {
        console.log('👁️ Tab visible - checking connection...');
        forceReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, isConnecting, forceReconnect]);

  // Auto-reconnect on network changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network online - forcing reconnection...');
      if (!isConnected && !isConnecting) forceReconnect();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isConnected, isConnecting, forceReconnect]);

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