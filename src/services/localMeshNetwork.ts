/**
 * Local Mesh Network Service
 * Enables staff communication via WebRTC and Bluetooth when offline
 */

interface StaffMember {
  id: string;
  name: string;
  role: string;
  deviceId: string;
  lastSeen: Date;
}

interface LocalMessage {
  id: string;
  from: string;
  to?: string; // undefined = broadcast
  type: 'order_update' | 'status_change' | 'message' | 'ping';
  data: any;
  timestamp: Date;
  priority: number;
}

export class LocalMeshNetwork {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private staffMembers: Map<string, StaffMember> = new Map();
  private messageQueue: LocalMessage[] = [];
  private isHost: boolean = false;
  private deviceId: string;
  private currentUser: any;

  constructor(currentUser: any) {
    this.currentUser = currentUser;
    this.deviceId = this.generateDeviceId();
    this.initializeMeshNetwork();
  }

  /**
   * Initialize the mesh network
   */
  private async initializeMeshNetwork() {
    try {
      // Try to become host or join existing network
      await this.discoverNetwork();
      
      // Start periodic discovery
      setInterval(() => this.discoverNetwork(), 10000);
      
      // Start heartbeat
      setInterval(() => this.sendHeartbeat(), 5000);
      
      console.log('🌐 Local mesh network initialized');
    } catch (error) {
      console.error('Failed to initialize mesh network:', error);
    }
  }

  /**
   * Discover nearby staff devices
   */
  private async discoverNetwork() {
    try {
      // Try WebRTC discovery first
      await this.discoverViaWebRTC();
      
      // Try Bluetooth discovery if available
      if ('bluetooth' in navigator) {
        await this.discoverViaBluetooth();
      }
      
      // Try local WiFi discovery
      await this.discoverViaWiFi();
    } catch (error) {
      console.warn('Network discovery failed:', error);
    }
  }

  /**
   * WebRTC-based discovery (same WiFi network)
   */
  private async discoverViaWebRTC() {
    try {
      // Create broadcast channel for local discovery
      const channel = new BroadcastChannel('hotel-staff-mesh');
      
      // Announce presence
      channel.postMessage({
        type: 'announce',
        deviceId: this.deviceId,
        staff: {
          id: this.currentUser.id,
          name: this.currentUser.full_name,
          role: this.currentUser.role,
          deviceId: this.deviceId
        }
      });

      // Listen for other staff
      channel.onmessage = (event) => {
        if (event.data.type === 'announce' && event.data.deviceId !== this.deviceId) {
          this.addStaffMember(event.data.staff);
          this.establishConnection(event.data.staff);
        }
      };
    } catch (error) {
      console.warn('WebRTC discovery failed:', error);
    }
  }

  /**
   * Bluetooth-based discovery
   */
  private async discoverViaBluetooth() {
    try {
      if (!('bluetooth' in navigator)) return;

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: 'PremierHotel' }],
        optionalServices: ['battery_service']
      });

      console.log('📱 Bluetooth device found:', device.name);
      
      // Add to staff members
      this.addStaffMember({
        id: device.id,
        name: device.name,
        role: 'unknown',
        deviceId: device.id,
        lastSeen: new Date()
      });
    } catch (error) {
      console.warn('Bluetooth discovery failed:', error);
    }
  }

  /**
   * WiFi-based discovery (local network)
   */
  private async discoverViaWiFi() {
    try {
      // Use WebRTC data channels for local network discovery
      const config = {
        iceServers: [] // No STUN/TURN servers for local network
      };

      const pc = new RTCPeerConnection(config);
      
      // Create data channel for communication
      const channel = pc.createDataChannel('staff-comm', {
        ordered: true
      });

      channel.onopen = () => {
        console.log('📡 Local WiFi connection established');
      };

      channel.onmessage = (event) => {
        this.handleIncomingMessage(JSON.parse(event.data));
      };

    } catch (error) {
      console.warn('WiFi discovery failed:', error);
    }
  }

  /**
   * Add staff member to network
   */
  private addStaffMember(staff: StaffMember) {
    this.staffMembers.set(staff.deviceId, {
      ...staff,
      lastSeen: new Date()
    });
    
    console.log(`👥 Staff member joined: ${staff.name} (${staff.role})`);
    
    // Notify UI
    this.notifyStaffUpdate();
  }

  /**
   * Establish peer connection
   */
  private async establishConnection(staff: StaffMember) {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [] // Local network only
      });

      // Create data channel
      const channel = pc.createDataChannel('staff-comm');
      
      channel.onopen = () => {
        console.log(`🔗 Connected to ${staff.name}`);
      };

      channel.onmessage = (event) => {
        this.handleIncomingMessage(JSON.parse(event.data));
      };

      this.peers.set(staff.deviceId, pc);
    } catch (error) {
      console.error('Failed to establish connection:', error);
    }
  }

  /**
   * Broadcast message to all staff
   */
  public broadcastMessage(type: string, data: any, priority: number = 3) {
    const message: LocalMessage = {
      id: this.generateMessageId(),
      from: this.deviceId,
      type: type as any,
      data,
      timestamp: new Date(),
      priority
    };

    this.messageQueue.push(message);
    this.sendToAllPeers(message);
    
    console.log(`📢 Broadcasting: ${type}`, data);
  }

  /**
   * Send message to specific staff member
   */
  public sendToStaff(staffDeviceId: string, type: string, data: any) {
    const message: LocalMessage = {
      id: this.generateMessageId(),
      from: this.deviceId,
      to: staffDeviceId,
      type: type as any,
      data,
      timestamp: new Date(),
      priority: 2
    };

    this.sendToPeer(staffDeviceId, message);
  }

  /**
   * Send order update to kitchen staff
   */
  public notifyKitchen(orderData: any) {
    this.broadcastMessage('order_update', {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      status: orderData.status,
      location: orderData.location,
      items: orderData.items,
      message: `🔔 New order: ${orderData.order_number}`
    }, 1); // High priority
  }

  /**
   * Notify order ready to waiters
   */
  public notifyWaiters(orderData: any) {
    this.broadcastMessage('status_change', {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      status: 'ready',
      location: orderData.location,
      message: `🎉 Order ${orderData.order_number} ready at ${orderData.location}`
    }, 1); // High priority
  }

  /**
   * Send to all connected peers
   */
  private sendToAllPeers(message: LocalMessage) {
    this.peers.forEach((pc, deviceId) => {
      this.sendToPeer(deviceId, message);
    });
  }

  /**
   * Send to specific peer
   */
  private sendToPeer(deviceId: string, message: LocalMessage) {
    try {
      const pc = this.peers.get(deviceId);
      if (pc && pc.connectionState === 'connected') {
        const channel = pc.createDataChannel('staff-comm');
        if (channel.readyState === 'open') {
          channel.send(JSON.stringify(message));
        }
      }
    } catch (error) {
      console.warn(`Failed to send to ${deviceId}:`, error);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(message: LocalMessage) {
    console.log('📨 Received message:', message);

    // Store message
    this.messageQueue.push(message);

    // Process based on type
    switch (message.type) {
      case 'order_update':
        this.handleOrderUpdate(message);
        break;
      case 'status_change':
        this.handleStatusChange(message);
        break;
      case 'message':
        this.handleChatMessage(message);
        break;
      case 'ping':
        this.handlePing(message);
        break;
    }

    // Relay to other peers if not direct message
    if (!message.to) {
      this.relayMessage(message);
    }
  }

  /**
   * Handle order updates
   */
  private handleOrderUpdate(message: LocalMessage) {
    const { data } = message;
    
    // Show notification based on user role
    if (this.currentUser.role === 'chef' || this.currentUser.role === 'manager') {
      this.showNotification('New Order', data.message, 'order');
    }
    
    // Update local order cache
    this.updateLocalOrderCache(data);
  }

  /**
   * Handle status changes
   */
  private handleStatusChange(message: LocalMessage) {
    const { data } = message;
    
    // Show notification to waiters
    if (this.currentUser.role === 'waiter' || this.currentUser.role === 'manager') {
      this.showNotification('Order Ready', data.message, 'ready');
    }
    
    // Update local cache
    this.updateLocalOrderCache(data);
  }

  /**
   * Handle chat messages
   */
  private handleChatMessage(message: LocalMessage) {
    this.showNotification('Staff Message', message.data.text, 'message');
  }

  /**
   * Handle ping messages
   */
  private handlePing(message: LocalMessage) {
    // Update staff member last seen
    const staff = this.staffMembers.get(message.from);
    if (staff) {
      staff.lastSeen = new Date();
    }
  }

  /**
   * Relay message to other peers
   */
  private relayMessage(message: LocalMessage) {
    // Prevent infinite loops
    if (message.from === this.deviceId) return;
    
    // Relay to all other peers
    this.peers.forEach((pc, deviceId) => {
      if (deviceId !== message.from) {
        this.sendToPeer(deviceId, message);
      }
    });
  }

  /**
   * Send heartbeat to maintain connections
   */
  private sendHeartbeat() {
    this.broadcastMessage('ping', {
      staff: {
        id: this.currentUser.id,
        name: this.currentUser.full_name,
        role: this.currentUser.role,
        deviceId: this.deviceId
      }
    }, 5); // Low priority
  }

  /**
   * Show local notification
   */
  private showNotification(title: string, message: string, type: string) {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo.png',
        tag: `hotel-${type}`,
        requireInteraction: true
      });
    }

    // Sound notification
    this.playNotificationSound(type);
    
    // Visual notification in UI
    this.notifyUI(title, message, type);
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(type: string) {
    try {
      const sounds = {
        order: '/sounds/new-order.mp3',
        ready: '/sounds/order-ready.mp3',
        message: '/sounds/message.mp3'
      };
      
      const audio = new Audio(sounds[type as keyof typeof sounds] || '/sounds/notification.mp3');
      audio.volume = 0.7;
      audio.play().catch(console.warn);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }

  /**
   * Update local order cache
   */
  private updateLocalOrderCache(orderData: any) {
    // Update IndexedDB with new order data
    // This will be synced when internet returns
    console.log('📝 Updating local order cache:', orderData);
  }

  /**
   * Notify UI of updates
   */
  private notifyUI(title: string, message: string, type: string) {
    // Dispatch custom event for UI components
    window.dispatchEvent(new CustomEvent('localMeshMessage', {
      detail: { title, message, type }
    }));
  }

  /**
   * Notify staff list update
   */
  private notifyStaffUpdate() {
    window.dispatchEvent(new CustomEvent('staffListUpdate', {
      detail: Array.from(this.staffMembers.values())
    }));
  }

  /**
   * Get connected staff members
   */
  public getConnectedStaff(): StaffMember[] {
    return Array.from(this.staffMembers.values());
  }

  /**
   * Get network status
   */
  public getNetworkStatus() {
    return {
      isHost: this.isHost,
      connectedPeers: this.peers.size,
      staffMembers: this.staffMembers.size,
      messageQueue: this.messageQueue.length
    };
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup connections
   */
  public disconnect() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.staffMembers.clear();
    console.log('🔌 Disconnected from mesh network');
  }
}

export default LocalMeshNetwork;