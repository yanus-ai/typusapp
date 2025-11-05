import { useEffect, useRef, useCallback, useState } from 'react';
import { getAuthToken, isTokenExpired } from '@/lib/auth';

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
          ws.current.close(1006, 'Heartbeat timeout');
          return;
        }
        
        // Send ping
        ws.current.send(JSON.stringify({ type: 'ping', timestamp: now }));
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

    // Check if token is expired before attempting connection
    const token = getAuthToken();
    if (token && isTokenExpired(token)) {
      console.error('❌ Cannot connect WebSocket: token is expired');
      setIsConnected(false);
      isConnecting.current = false;
      return;
    }

    isConnecting.current = true;
    
    try {
      // Add authentication token to WebSocket URL
      const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
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
            return;
          }
          
          messageHandlerRef.current?.(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        isConnecting.current = false;
        stopHeartbeat(); // Stop heartbeat monitoring
        disconnectHandlerRef.current?.();

        // Check if closure was due to token expiration (code 1008)
        // Code 1008 = Policy Violation - server explicitly closes connection due to auth failure
        if (event.code === 1008) {
          console.warn('⚠️ WebSocket closed with code 1008 (authentication failure)');
          
          // Try to parse the close reason to confirm it's token expiration
          let isTokenExpiredError = false;
          try {
            const closeReason = event.reason;
            if (closeReason) {
              const reasonData = JSON.parse(closeReason);
              if (reasonData.reason === 'token_expired') {
                isTokenExpiredError = true;
                console.warn('⚠️ WebSocket closed due to token expiration');
              }
            }
          } catch (e) {
            // If we can't parse, assume it's an auth error anyway (code 1008 = auth failure)
            isTokenExpiredError = true;
            console.warn('⚠️ WebSocket closed with code 1008 (likely token expiration)');
          }

          // If token expired, check if we have a fresh (non-expired) token
          if (isTokenExpiredError) {
            const freshToken = getAuthToken();
            
            // Check if the token is actually expired (not just the server saying so)
            if (!freshToken || isTokenExpired(freshToken)) {
              console.error('❌ Cannot reconnect WebSocket: token is expired');
              // Clear expired token to prevent further attempts
              if (freshToken) {
                console.log('🧹 Clearing expired token from storage');
                localStorage.removeItem('token');
              }
              // Stop all reconnection attempts
              return;
            }
            
            // Token exists and is not expired, might have been refreshed externally
            // Allow one reconnection attempt
            if (reconnectCount.current === 0) {
              console.log('🔄 Attempting reconnection with fresh token');
              reconnectCount.current++;
              reconnectTimeout.current = setTimeout(() => {
                connect();
              }, reconnectInterval);
              return;
            } else {
              console.error('❌ Already attempted reconnection, stopping');
              return;
            }
          }
        }

        // Only reconnect if it wasn't a manual close AND not a 1008 error
        if (event.code !== 1000 && event.code !== 1008 && reconnectCount.current < reconnectAttempts) {
          reconnectCount.current++;
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCount.current >= reconnectAttempts) {
          console.error('❌ WebSocket reconnection attempts exhausted');
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