import { io, Socket } from 'socket.io-client';
import type { ServerInfo, VpnType, VpnConfig } from '@/stores/deploy';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export type SocketEventCallback = (data: any) => void;

export class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      this.socket.on('disconnect', () => {
        // Handle disconnection
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onDeployStart(callback: (data: { deploymentId: string; message: string }) => void): void {
    this.socket?.on('deploy:start', callback);
  }

  onDeployLog(callback: (data: { deploymentId: string; log: string; timestamp: string }) => void): void {
    this.socket?.on('deploy:log', callback);
  }

  onDeployComplete(callback: (data: { deploymentId: string; config: VpnConfig; timestamp: string }) => void): void {
    this.socket?.on('deploy:complete', callback);
  }

  onDeployError(callback: (data: { deploymentId: string; error: string; timestamp: string }) => void): void {
    this.socket?.on('deploy:error', callback);
  }

  offDeployStart(): void {
    this.socket?.off('deploy:start');
  }

  offDeployLog(): void {
    this.socket?.off('deploy:log');
  }

  offDeployComplete(): void {
    this.socket?.off('deploy:complete');
  }

  offDeployError(): void {
    this.socket?.off('deploy:error');
  }

  startDeploy(serverInfo: ServerInfo, vpnType: VpnType): void {
    this.socket?.emit('deploy:start', {
      ...serverInfo,
      vpnType,
    });
  }

  ping(): void {
    this.socket?.emit('ping');
  }

  onPong(callback: (data: { timestamp: string }) => void): void {
    this.socket?.on('pong', callback);
  }

  removeAllListeners(): void {
    this.offDeployStart();
    this.offDeployLog();
    this.offDeployComplete();
    this.offDeployError();
  }

  // Force disconnect for cleanup
  forceDisconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketService = new SocketService();

export default socketService;
