import React, { useState, useEffect } from 'react';
import { useWebSocketSingleton, WS_EVENTS } from '../hooks/useWebSocketSingleton';

const WebSocketTest: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  const { isConnected, connectionStatus: wsStatus, on } = useWebSocketSingleton({
    autoConnect: true,
    onConnect: () => {
      console.log('WebSocket connected successfully');
      setConnectionStatus('connected');
      addMessage('WebSocket connected successfully');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
      addMessage('WebSocket disconnected');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      addMessage(`WebSocket error: ${error.message}`);
    }
  });

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Subscribe to various events
    const unsubscribes = [
      on(WS_EVENTS.NOTIFICATION, (data) => {
        addMessage(`Notification: ${JSON.stringify(data)}`);
      }),
      on(WS_EVENTS.ORDER_CREATED, (data) => {
        addMessage(`Order Created: ${JSON.stringify(data)}`);
      }),
      on(WS_EVENTS.ORDER_STATUS_CHANGED, (data) => {
        addMessage(`Order Status Changed: ${JSON.stringify(data)}`);
      }),
      on(WS_EVENTS.MESSAGE_READ, (data) => {
        addMessage(`Message Read: ${JSON.stringify(data)}`);
      }),
      on(WS_EVENTS.ALL, (data) => {
        addMessage(`Wildcard Event: ${JSON.stringify(data)}`);
      })
    ];

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [on]);

  useEffect(() => {
    setConnectionStatus(wsStatus);
  }, [wsStatus]);

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">WebSocket Test Component</h3>
      
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-800'
            : connectionStatus === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          Status: {connectionStatus}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Recent Events:</h4>
        <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No events yet...</p>
          ) : (
            messages.slice(-10).map((msg, index) => (
              <div key={index} className="text-sm text-gray-700 mb-1">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        This component tests the WebSocket singleton to ensure only one connection per user.
        Check the browser console for detailed WebSocket logs.
      </div>
    </div>
  );
};

export default WebSocketTest;