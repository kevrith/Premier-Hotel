/**
 * Local Mesh Network Hook
 * React hook for staff local communication
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LocalMeshNetwork from '@/services/localMeshNetwork';
import { toast } from 'react-hot-toast';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  deviceId: string;
  lastSeen: Date;
}

interface NetworkStatus {
  isHost: boolean;
  connectedPeers: number;
  staffMembers: number;
  messageQueue: number;
}

export function useLocalMeshNetwork() {
  const { user, isAuthenticated } = useAuth();
  const [meshNetwork, setMeshNetwork] = useState<LocalMeshNetwork | null>(null);
  const [connectedStaff, setConnectedStaff] = useState<StaffMember[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isHost: false,
    connectedPeers: 0,
    staffMembers: 0,
    messageQueue: 0
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize mesh network for staff members
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Only initialize for staff members
    const staffRoles = ['chef', 'waiter', 'cleaner', 'manager', 'admin'];
    if (!staffRoles.includes(user.role)) return;

    const network = new LocalMeshNetwork(user);
    setMeshNetwork(network);

    console.log(`🌐 Local mesh network initialized for ${user.role}: ${user.full_name}`);

    return () => {
      network.disconnect();
    };
  }, [isAuthenticated, user]);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Internet connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('📡 Internet connection lost - Using local mesh network');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for mesh network messages
  useEffect(() => {
    const handleMeshMessage = (event: CustomEvent) => {
      const { title, message, type } = event.detail;
      
      const icons = {
        order: '🔔',
        ready: '🎉',
        message: '💬'
      };

      toast(message, {
        icon: icons[type as keyof typeof icons] || '📢',
        duration: 8000,
        position: 'top-right'
      });
    };

    const handleStaffUpdate = (event: CustomEvent) => {
      setConnectedStaff(event.detail);
    };

    window.addEventListener('localMeshMessage', handleMeshMessage as EventListener);
    window.addEventListener('staffListUpdate', handleStaffUpdate as EventListener);

    return () => {
      window.removeEventListener('localMeshMessage', handleMeshMessage as EventListener);
      window.removeEventListener('staffListUpdate', handleStaffUpdate as EventListener);
    };
  }, []);

  // Update network status periodically
  useEffect(() => {
    if (!meshNetwork) return;

    const updateStatus = () => {
      setNetworkStatus(meshNetwork.getNetworkStatus());
      setConnectedStaff(meshNetwork.getConnectedStaff());
    };

    const interval = setInterval(updateStatus, 5000);
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, [meshNetwork]);

  // Broadcast new order to kitchen staff
  const notifyKitchen = useCallback((orderData: any) => {
    if (!meshNetwork) return;
    
    meshNetwork.notifyKitchen(orderData);
    console.log('🍳 Notified kitchen staff about new order:', orderData.order_number);
  }, [meshNetwork]);

  // Notify waiters that order is ready
  const notifyWaiters = useCallback((orderData: any) => {
    if (!meshNetwork) return;
    
    meshNetwork.notifyWaiters(orderData);
    console.log('🍽️ Notified waiters that order is ready:', orderData.order_number);
  }, [meshNetwork]);

  // Send message to specific staff member
  const sendToStaff = useCallback((staffDeviceId: string, message: string) => {
    if (!meshNetwork) return;
    
    meshNetwork.sendToStaff(staffDeviceId, 'message', {
      text: message,
      from: user?.full_name || 'Unknown'
    });
  }, [meshNetwork, user]);

  // Broadcast message to all staff
  const broadcastMessage = useCallback((message: string, priority: number = 3) => {
    if (!meshNetwork) return;
    
    meshNetwork.broadcastMessage('message', {
      text: message,
      from: user?.full_name || 'Unknown'
    }, priority);
  }, [meshNetwork, user]);

  // Get staff by role
  const getStaffByRole = useCallback((role: string): StaffMember[] => {
    return connectedStaff.filter(staff => staff.role === role);
  }, [connectedStaff]);

  // Check if specific staff role is online
  const isRoleOnline = useCallback((role: string): boolean => {
    return connectedStaff.some(staff => staff.role === role);
  }, [connectedStaff]);

  return {
    // Network state
    isOnline,
    networkStatus,
    connectedStaff,
    
    // Staff queries
    getStaffByRole,
    isRoleOnline,
    
    // Communication methods
    notifyKitchen,
    notifyWaiters,
    sendToStaff,
    broadcastMessage,
    
    // Utility
    isNetworkAvailable: !!meshNetwork,
    chefCount: getStaffByRole('chef').length,
    waiterCount: getStaffByRole('waiter').length,
    cleanerCount: getStaffByRole('cleaner').length
  };
}

export default useLocalMeshNetwork;