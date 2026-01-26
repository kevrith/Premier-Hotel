/**
 * Singleton WebSocket Manager
 * Ensures only one WebSocket connection per user across all components
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

// Singleton connection state
class WebSocketSingleton {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isConnecting = false;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private eventHandlers = new Map<string, Set<WebSocketEventHandler>>();
  private subscribers = new Set<string>(); // Track active subscribers
  private lastAuthCheck = 0;

  // Connection management
  async connect(userIdentifier: string, options: UseWebSocketOptions = {}): Promise<void> {
    const { 
      reconnectInterval = 5000, 
      maxReconnectAttempts = 5,
      onConnect,
      onDisconnect,
      onError 
    } = options;

    // Add subscriber
    this.subscribers.add(userIdentifier);

    // If already connected, just return
    if (this.isConnected) {
      return;
    }

    // If connecting, wait for it to complete
    if (this.isConnecting) {
      return;
    }

    // Check if user is authenticated
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      this.connectionStatus = 'disconnected';
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';

    // Close existing connection
    if (this.ws) {
      this.ws.close();
    }

    try {
      // Get authentication token for WebSocket
      const authToken = await this.getToken();
      if (!authToken) {
        console.log('[WebSocket] No auth token available');
        this.connectionStatus = 'disconnected';
        this.isConnecting = false;
        return;
      }

      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost'
        ? 'localhost:8000'
        : window.location.host;

      const wsUrl = `${protocol}//${host}/api/v1/ws?token=${encodeURIComponent(authToken)}`;
      
      console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connection opened successfully');
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
          }
        }, 30000);

        onConnect?.();
      };

      this.ws.onmessage = (event) => {
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

          const handlers = this.eventHandlers.get(message.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message.data);
              } catch (error) {
                console.error(`Error in event handler for ${message.type}:`, error);
              }
            });
          }

          const wildcardHandlers = this.eventHandlers.get('*');
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

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.connectionStatus = 'error';
        this.isConnecting = false;
        onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.isConnecting = false;

        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        onDisconnect?.();

        // Auto-reconnect logic
        if (this.reconnectAttempts < maxReconnectAttempts && this.subscribers.size > 0) {
          this.reconnectAttempts++;
          console.log(`[WebSocket] Reconnecting... (Attempt ${this.reconnectAttempts}/${maxReconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect(userIdentifier, options);
          }, reconnectInterval * this.reconnectAttempts);
        } else {
          console.log('[WebSocket] Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.connectionStatus = 'error';
      onError?.(error as Error);
    }
  }

  disconnect(userIdentifier: string): void {
    // Remove subscriber
    this.subscribers.delete(userIdentifier);

    // Only disconnect if no more subscribers
    if (this.subscribers.size === 0) {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.isConnecting = false;
    }
  }

  subscribe(eventType: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler);

    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    return this.connectionStatus;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  private async getToken(): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/ws-token', {
        method: 'GET',
        credentials: 'include',
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
        if (response.status === 401) {
          console.log('[WebSocket] Authentication required - user may need to login again');
        }
        return null;
      }
    } catch (error) {
      console.error('[WebSocket] Error getting WebSocket token:', error);
      return null;
    }
  }
}

// Create singleton instance
const webSocketSingleton = new WebSocketSingleton();

// Hook that uses the singleton
export const useWebSocketSingleton = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get auth state
  const { isAuthenticated, hasHydrated } = useAuthStore();

  // Subscribe to events
  const on = useCallback((eventType: string, handler: WebSocketEventHandler) => {
    const unsubscribe = webSocketSingleton.subscribe(eventType, handler);
    return unsubscribe;
  }, []);

  // Send message
  const send = useCallback((message: any) => {
    webSocketSingleton.send(message);
  }, []);

  // Connect
  const connect = useCallback(async () => {
    await webSocketSingleton.connect(componentId.current, {
      ...options,
      onConnect: () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        onConnect?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onDisconnect?.();
      },
      onError: (error) => {
        setConnectionStatus('error');
        onError?.(error);
      }
    });
  }, [options, onConnect, onDisconnect, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    webSocketSingleton.disconnect(componentId.current);
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Auto-connect when auth is ready
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const connectTimer = setTimeout(async () => {
      if (autoConnect && isAuthenticated) {
        console.log('[WebSocket] Auto-connecting after auth ready');
        await connect();
      } else if (!isAuthenticated) {
        console.log('[WebSocket] Not authenticated, disconnecting');
        disconnect();
      }
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
    };
  }, [autoConnect, hasHydrated, isAuthenticated, connect, disconnect]);

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      const status = webSocketSingleton.getConnectionStatus();
      setConnectionStatus(status);
      setIsConnected(webSocketSingleton.isConnectedToServer());
    };

    // Initial update
    updateStatus();

    // Set up periodic updates
    const interval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      webSocketSingleton.disconnect(componentId.current);
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    on,
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