import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private subscribed = false;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      if (this.subscribed) {
        this.socket?.emit('monitor:subscribe');
      }
    });

    this.socket.on('disconnect', () => {
      // Handle disconnection
    });

    this.socket.on('error', (error) => {
      // Handle error
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('monitor:unsubscribe');
      this.socket.disconnect();
      this.socket = null;
      this.subscribed = false;
    }
  }

  subscribeToMonitoring(callbacks: {
    onMetrics?: (data: { deploymentId: string; metrics: any; timestamp: string }) => void;
    onHealth?: (data: { deploymentId: string; result: any; timestamp: string }) => void;
    onUpdated?: (data: { deploymentId: string; [key: string]: any }) => void;
  }) {
    const socket = this.connect();

    socket.emit('monitor:subscribe');
    this.subscribed = true;

    if (callbacks.onMetrics) {
      socket.on('monitor:metrics', callbacks.onMetrics);
    }

    if (callbacks.onHealth) {
      socket.on('monitor:health', callbacks.onHealth);
    }

    if (callbacks.onUpdated) {
      socket.on('deployment:updated', callbacks.onUpdated);
    }
  }

  unsubscribeFromMonitoring() {
    if (this.socket) {
      this.socket.emit('monitor:unsubscribe');
      this.subscribed = false;
    }
  }

  subscribeToDeployment(deploymentId: string, callbacks: {
    onUpdated?: (data: any) => void;
    onHealth?: (data: any) => void;
    onMetrics?: (data: any) => void;
  }) {
    const socket = this.connect();
    socket.emit('deployment:subscribe', deploymentId);

    if (callbacks.onUpdated) {
      socket.on(`deployment:updated:${deploymentId}`, callbacks.onUpdated);
    }

    if (callbacks.onHealth) {
      socket.on(`deployment:health:${deploymentId}`, callbacks.onHealth);
    }

    if (callbacks.onMetrics) {
      socket.on(`deployment:metrics:${deploymentId}`, callbacks.onMetrics);
    }
  }

  unsubscribeFromDeployment(deploymentId: string) {
    if (this.socket) {
      this.socket.emit('deployment:unsubscribe', deploymentId);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
export default wsService;
