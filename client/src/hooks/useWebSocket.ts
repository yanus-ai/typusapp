import { useEffect, useRef, useCallback, useState } from 'react';
import { getAuthToken } from '@/lib/auth';

interface WebSocketMessage {
  type: string;
  inputImageId?: number;
  data?: any;
  error?: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastPongTime = useRef<number>(Date.now());

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 3000
  } = options;

  // Stable callbacks using useRef to prevent dependency changes
  const messageHandlerRef = useRef(onMessage);
  const connectHandlerRef = useRef(onConnect);
  const disconnectHandlerRef = useRef(onDisconnect);
  const errorHandlerRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    messageHandlerRef.current = onMessage;
    connectHandlerRef.current = onConnect;
    disconnectHandlerRef.current = onDisconnect;
    errorHandlerRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  // Heartbeat mechanism to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        
        // Check if we haven't received a pong in 30 seconds
        if (now - lastPongTime.current > 30000) {
          console.log('💔 WebSocket heartbeat failed - forcing reconnection');
          ws.current.close(1006, 'Heartbeat timeout');
          return;
        }
        
        // Send ping
        ws.current.send(JSON.stringify({ type: 'ping', timestamp: now }));
        console.log('💗 WebSocket heartbeat ping sent');
      }
    }, 15000); // Send ping every 15 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple concurrent connections
    if (isConnecting.current || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnecting.current = true;
    
    try {
      // Add authentication token to WebSocket URL
      const token = getAuthToken();
      const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
      
      console.log('🔗 Connecting to WebSocket:', url, token ? '(with auth)' : '(no auth)');
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        isConnecting.current = false;
        reconnectCount.current = 0;
        lastPongTime.current = Date.now(); // Reset heartbeat timer
        startHeartbeat(); // Start heartbeat monitoring
        connectHandlerRef.current?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pong responses to keep connection alive
          if (message.type === 'pong') {
            lastPongTime.current = Date.now();
            console.log('💗 WebSocket heartbeat pong received');
            return;
          }
          
          messageHandlerRef.current?.(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        isConnecting.current = false;
        stopHeartbeat(); // Stop heartbeat monitoring
        disconnectHandlerRef.current?.();

        // Only reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectCount.current < reconnectAttempts) {
          reconnectCount.current++;
          console.log(`🔄 Reconnecting (${reconnectCount.current}/${reconnectAttempts}) in ${reconnectInterval}ms...`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCount.current >= reconnectAttempts) {
          console.log('❌ Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        isConnecting.current = false;
        stopHeartbeat(); // Stop heartbeat monitoring
        errorHandlerRef.current?.(error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsConnected(false);
      isConnecting.current = false;
    }
  }, [url, reconnectAttempts, reconnectInterval, startHeartbeat, stopHeartbeat]);

  const sendMessage = useCallback((message: Record<string, any>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', message);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    stopHeartbeat(); // Stop heartbeat monitoring
    
    if (ws.current) {
      // Use code 1000 for normal closure to prevent reconnection
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setIsConnected(false);
    isConnecting.current = false;
    reconnectCount.current = 0;
  }, [stopHeartbeat]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]); // Only depend on URL, not the connect/disconnect functions

  return {
    sendMessage,
    disconnect,
    isConnected
  };
};