import { useEffect, useRef, useCallback, useState } from 'react';

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

  const connect = useCallback(() => {
    // Prevent multiple concurrent connections
    if (isConnecting.current || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnecting.current = true;
    
    try {
      console.log('🔗 Connecting to WebSocket:', url);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        isConnecting.current = false;
        reconnectCount.current = 0;
        connectHandlerRef.current?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          messageHandlerRef.current?.(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        isConnecting.current = false;
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
        errorHandlerRef.current?.(error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsConnected(false);
      isConnecting.current = false;
    }
  }, [url, reconnectAttempts, reconnectInterval]);

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
    
    if (ws.current) {
      // Use code 1000 for normal closure to prevent reconnection
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setIsConnected(false);
    isConnecting.current = false;
    reconnectCount.current = 0;
  }, []);

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