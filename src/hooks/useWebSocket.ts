/**
 * WebSocket Hook for Real-time Updates
 * Manages WebSocket connection and event handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import useAuthStore from '@/stores/authStore';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

export type WebSocketEventHandler = (data: any) => void;

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map());
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get token and hydration state from auth store
  const { token, isAuthenticated, hasHydrated } = useAuthStore();

  // Debug: Log auth state on every render to trace issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const authStorage = localStorage.getItem('auth-storage');
      let parsedToken = null;
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          parsedToken = parsed.state?.token ? 'EXISTS' : 'NULL';
        } catch (e) {
          parsedToken = 'PARSE_ERROR';
        }
      }
      console.log('[WebSocket] Auth state debug:', {
        hasHydrated,
        isAuthenticated,
        zustandToken: token ? 'EXISTS' : 'NULL',
        localStorageToken: parsedToken,
        accessToken: localStorage.getItem('access_token') ? 'EXISTS' : 'NULL'
      });
    }
  }, [hasHydrated, isAuthenticated, token]);

  // Get auth token - for cookie-based auth, we need to get a WebSocket token from the API
  const getToken = useCallback(async (): Promise<string | null> => {
    // For cookie-based auth, get a WebSocket-specific token from the API
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/ws-token', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[WebSocket] Got WebSocket token from API');
        return data.ws_token;
      } else {
        console.log('[WebSocket] Failed to get WebSocket token, status:', response.status);
        // Check if it's an auth error
        if (response.status === 401) {
          console.log('[WebSocket] Authentication required - user may need to login again');
        }
        return null;
      }
    } catch (error) {
      console.error('[WebSocket] Error getting WebSocket token:', error);
      return null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      // Prevent multiple simultaneous connections
      if (isConnecting || isConnected) {
        console.log('[WebSocket] Already connecting or connected, skipping');
        return;
      }

      // For cookie-based auth, we need to get a token for WebSocket connection
      if (!isAuthenticated) {
        console.log('[WebSocket] Not authenticated, skipping connection');
        setConnectionStatus('disconnected');
        return;
      }

      setIsConnecting(true);
      setConnectionStatus('connecting');

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Get authentication token for WebSocket
      const authToken = await getToken();
      if (!authToken) {
        console.log('[WebSocket] No auth token available');
        setConnectionStatus('disconnected');
        setIsConnecting(false);
        return;
      }

      // Create WebSocket connection with token as query parameter
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost'
        ? 'localhost:8000'
        : window.location.host;

      const wsUrl = `${protocol}//${host}/api/v1/ws?token=${encodeURIComponent(authToken)}`;
      
      console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      console.log('[WebSocket] Available cookies:', document.cookie);
      
      const ws = new WebSocket(wsUrl);
      
      // Send authentication after connection opens
      ws.onopen = () => {
        console.log('[WebSocket] Connection opened successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
          }
        }, 30000);

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'connection_ack') {
            if (process.env.NODE_ENV === 'development') {
              console.log('Connection acknowledged:', message.data);
            }
            return;
          }

          if (message.type === 'pong') {
            return;
          }

          const handlers = eventHandlersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message.data);
              } catch (error) {
                console.error(`Error in event handler for ${message.type}:`, error);
              }
            });
          }

          const wildcardHandlers = eventHandlersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('Error in wildcard event handler:', error);
              }
            });
          }

        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        console.log('[WebSocket] WebSocket state:', ws.readyState);
        console.log('[WebSocket] Available cookies:', document.cookie);
        setConnectionStatus('error');
        setIsConnecting(false);
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setIsConnecting(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        onDisconnect?.();

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[WebSocket] Reconnecting... (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * reconnectAttemptsRef.current); // Exponential backoff
        } else {
          console.log('[WebSocket] Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WebSocket] Connection error:', error);
      }
      setConnectionStatus('error');
      onError?.(error as Error);
    }
  }, [isAuthenticated, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    setIsConnecting(false);
  }, []);

  // Subscribe to an event
  const on = useCallback((eventType: string, handler: WebSocketEventHandler) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }

    eventHandlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Unsubscribe from an event
  const off = useCallback((eventType: string, handler: WebSocketEventHandler) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType);
      }
    }
  }, []);

  // Send message through WebSocket
  const send = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Auto-connect when auth is ready (after hydration)
  useEffect(() => {
    // Wait for auth store to hydrate before attempting connection
    if (!hasHydrated) {
      return;
    }

    // Add a small delay to ensure auth is ready after hydration
    const connectTimer = setTimeout(async () => {
      if (autoConnect && isAuthenticated) {
        console.log('[WebSocket] Auto-connecting after auth ready');
        
        // Test if we can get a WebSocket token before attempting connection
        const testToken = await getToken();
        if (testToken) {
          connect();
        } else {
          console.log('[WebSocket] Cannot get WebSocket token, user may need to log in again');
          setConnectionStatus('disconnected');
        }
      } else if (!isAuthenticated) {
        console.log('[WebSocket] Not authenticated, disconnecting');
        disconnect();
      }
    }, 1000); // Increased delay to 1000ms to prevent rapid reconnection attempts

    return () => {
      clearTimeout(connectTimer);
    };
  }, [autoConnect, hasHydrated, isAuthenticated, connect, disconnect, getToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    on,
    off,
    send
  };
};

// Event type constants
export const WS_EVENTS = {
  // Notifications
  NOTIFICATION: 'notification',

  // Bookings
  BOOKING_CREATED: 'booking_created',
  BOOKING_UPDATED: 'booking_updated',
  BOOKING_CANCELLED: 'booking_cancelled',

  // Payments
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Orders
  ORDER_CREATED: 'order_created',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_READY: 'order_ready',
  ORDER_DELIVERED: 'order_delivered',

  // Rooms
  ROOM_AVAILABILITY_CHANGED: 'room_availability_changed',

  // Messages
  NEW_MESSAGE: 'new_message',
  MESSAGE_READ: 'message_read',

  // System
  SYSTEM_ANNOUNCEMENT: 'system_announcement',

  // Wildcard
  ALL: '*'
} as const;
