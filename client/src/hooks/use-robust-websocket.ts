import { useState, useEffect, useRef, useCallback } from 'react';

interface RobustWebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  reconnectDecay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

interface RobustWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: any;
  connectionAttempts: number;
  socket: WebSocket | null;
}

export function useRobustWebSocket(
  url: string,
  options: RobustWebSocketOptions = {}
) {
  const {
    maxReconnectAttempts = Infinity,
    reconnectInterval = 1000,
    maxReconnectInterval = 30000,
    reconnectDecay = 1.5,
    heartbeatInterval = 30000,
    connectionTimeout = 10000
  } = options;

  const [state, setState] = useState<RobustWebSocketState>({
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    connectionAttempts: 0,
    socket: null
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentReconnectIntervalRef = useRef(reconnectInterval);
  const messageQueueRef = useRef<any[]>([]);
  const shouldConnectRef = useRef(true);

  const clearAllTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        console.log('💓 Heartbeat sent');
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }
    }
  }, []);

  const scheduleHeartbeat = useCallback(() => {
    clearTimeout(heartbeatTimeoutRef.current!);
    heartbeatTimeoutRef.current = setTimeout(() => {
      sendHeartbeat();
      if (state.isConnected) {
        scheduleHeartbeat();
      }
    }, heartbeatInterval);
  }, [sendHeartbeat, heartbeatInterval, state.isConnected]);

  const processMessageQueue = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      
      queue.forEach(message => {
        try {
          socketRef.current!.send(typeof message === 'string' ? message : JSON.stringify(message));
          console.log('📤 Queued message sent:', message);
        } catch (error) {
          console.warn('Failed to send queued message:', error);
          messageQueueRef.current.push(message); // Re-queue failed message
        }
      });
    }
  }, []);

  const handleOpen = useCallback(() => {
    console.log('🔗 WebSocket connected successfully');
    
    setState(prev => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      connectionAttempts: 0,
      socket: socketRef.current
    }));

    currentReconnectIntervalRef.current = reconnectInterval;
    clearTimeout(connectionTimeoutRef.current!);
    
    // Process any queued messages
    processMessageQueue();
    
    // Start heartbeat
    scheduleHeartbeat();
  }, [reconnectInterval, processMessageQueue, scheduleHeartbeat]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      let data;
      
      // Robust message parsing with multiple fallback strategies
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        // If JSON parsing fails, try to extract data differently
        try {
          data = eval(`(${event.data})`); // Fallback parsing
        } catch (evalError) {
          // If all parsing fails, use raw data
          data = { type: 'raw', data: event.data, timestamp: Date.now() };
          console.warn('Message parsing failed, using raw data:', event.data);
        }
      }

      // Handle heartbeat responses
      if (data.type === 'pong') {
        console.log('💓 Heartbeat response received');
        return;
      }

      setState(prev => ({
        ...prev,
        lastMessage: data
      }));

      console.log('📥 WebSocket message received:', data);
    } catch (error) {
      console.warn('Error processing WebSocket message:', error, 'Raw data:', event.data);
      
      // Even if processing fails, still update with raw data
      setState(prev => ({
        ...prev,
        lastMessage: { type: 'error', data: event.data, error: error.message, timestamp: Date.now() }
      }));
    }
  }, []);

  const handleError = useCallback((error: Event) => {
    console.warn('🚨 WebSocket error occurred:', error);
    
    // Don't immediately disconnect on error, let the close handler manage it
    setState(prev => ({
      ...prev,
      lastMessage: { type: 'connection_error', error: 'WebSocket error occurred', timestamp: Date.now() }
    }));
  }, []);

  const handleClose = useCallback((event: CloseEvent) => {
    console.log('🔌 WebSocket connection closed:', event.code, event.reason);
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      socket: null
    }));

    clearAllTimeouts();
    
    // Attempt reconnection if it should connect and hasn't exceeded max attempts
    if (shouldConnectRef.current && state.connectionAttempts < maxReconnectAttempts) {
      const nextInterval = Math.min(
        currentReconnectIntervalRef.current * reconnectDecay,
        maxReconnectInterval
      );
      
      console.log(`🔄 Scheduling reconnection in ${nextInterval}ms (attempt ${state.connectionAttempts + 1})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, nextInterval);
      
      currentReconnectIntervalRef.current = nextInterval;
    }
  }, [state.connectionAttempts, maxReconnectAttempts, reconnectDecay, maxReconnectInterval, clearAllTimeouts]);

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.removeEventListener('open', handleOpen);
      socketRef.current.removeEventListener('message', handleMessage);
      socketRef.current.removeEventListener('error', handleError);
      socketRef.current.removeEventListener('close', handleClose);
      
      if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionAttempts: prev.connectionAttempts + 1
    }));

    try {
      console.log(`🚀 Attempting WebSocket connection to: ${url} (attempt ${state.connectionAttempts + 1})`);
      
      const socket = new WebSocket(url);
      
      // Force binary type to handle various message formats
      socket.binaryType = 'arraybuffer';
      
      socketRef.current = socket;

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.warn('⏰ Connection timeout, closing socket');
          socket.close();
        }
      }, connectionTimeout);

      // Enhanced event listeners with error boundaries
      socket.addEventListener('open', handleOpen);
      socket.addEventListener('message', handleMessage);
      socket.addEventListener('error', handleError);
      socket.addEventListener('close', handleClose);

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        lastMessage: { type: 'connection_failed', error: error.message, timestamp: Date.now() }
      }));

      // Retry connection after interval
      if (state.connectionAttempts < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(connect, currentReconnectIntervalRef.current);
      }
    }
  }, [url, handleOpen, handleMessage, handleError, handleClose, state.connectionAttempts, maxReconnectAttempts, connectionTimeout]);

  const disconnect = useCallback(() => {
    console.log('🛑 Manually disconnecting WebSocket');
    shouldConnectRef.current = false;
    clearAllTimeouts();
    
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      socket: null
    }));
  }, [clearAllTimeouts]);

  const sendMessage = useCallback((message: any) => {
    const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(messageToSend);
        console.log('📤 Message sent successfully:', message);
        return true;
      } catch (error) {
        console.warn('❌ Failed to send message, queuing for retry:', error);
        messageQueueRef.current.push(message);
        return false;
      }
    } else {
      console.log('📋 WebSocket not ready, queuing message:', message);
      messageQueueRef.current.push(message);
      return false;
    }
  }, []);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting WebSocket');
    setState(prev => ({ ...prev, connectionAttempts: 0 }));
    currentReconnectIntervalRef.current = reconnectInterval;
    
    if (socketRef.current) {
      socketRef.current.close();
    } else {
      connect();
    }
  }, [connect, reconnectInterval]);

  // Initial connection and cleanup
  useEffect(() => {
    shouldConnectRef.current = true;
    connect();

    return () => {
      shouldConnectRef.current = false;
      clearAllTimeouts();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, clearAllTimeouts]);

  // Auto-reconnect on visibility change (when tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !state.isConnected && !state.isConnecting) {
        console.log('👁️ Tab became visible, checking connection...');
        forceReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isConnected, state.isConnecting, forceReconnect]);

  // Auto-reconnect on network status change
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network came online, checking connection...');
      if (!state.isConnected && !state.isConnecting) {
        forceReconnect();
      }
    };

    const handleOffline = () => {
      console.log('📴 Network went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isConnected, state.isConnecting, forceReconnect]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    lastMessage: state.lastMessage,
    connectionAttempts: state.connectionAttempts,
    socket: state.socket,
    sendMessage,
    disconnect,
    forceReconnect
  };
}