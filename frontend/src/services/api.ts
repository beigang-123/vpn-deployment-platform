import axios from 'axios';
import type { ServerInfo, VpnType, VpnConfig } from '@/stores/deploy';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Development logging - remove in production or use proper logger
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface DeployResponse {
  id: string;
  serverIp: string;
  sshPort: number;
  username: string;
  vpnType: VpnType;
  status: string;
  createdAt: string;
  updatedAt?: string;
  configJson?: VpnConfig;
  errorMessage?: string;
  region?: string;
  nodeName?: string;
  expiryDate?: string;
  systemMetrics?: SystemMetrics;
  bandwidthMetrics?: BandwidthMetrics;
  onlineUsers?: number;
  latency?: number;
  autoRestart?: boolean;
  vpnPort?: number;
  uuid?: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
}

export interface BandwidthMetrics {
  totalRx: number;
  totalTx: number;
  currentRx: number;
  currentTx: number;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  serviceRunning: boolean;
  portAccessible: boolean;
  metrics?: SystemMetrics;
  latency?: number;
  error?: string;
}

export const deployApi = {
  /**
   * Start deployment
   */
  async startDeploy(serverInfo: ServerInfo, vpnType: VpnType): Promise<DeployResponse> {
    const response = await api.post<DeployResponse>('/deploy/start', {
      ...serverInfo,
      vpnType,
    });
    return response.data;
  },

  /**
   * Get deployment status
   */
  async getDeployStatus(id: string): Promise<DeployResponse> {
    const response = await api.get<DeployResponse>(`/deploy/status/${id}`);
    return response.data;
  },

  /**
   * Download config
   */
  async downloadConfig(id: string): Promise<VpnConfig> {
    const response = await api.get<VpnConfig>(`/config/download/${id}`);
    return response.data;
  },

  /**
   * Get all deployments
   */
  async getDeploymentList(): Promise<DeployResponse[]> {
    const response = await api.get<DeployResponse[]>('/deploy/list');
    return response.data;
  },

  /**
   * Get deployment detail
   */
  async getDeployment(id: string): Promise<DeployResponse> {
    const response = await api.get<DeployResponse>(`/deploy/${id}`);
    return response.data;
  },

  /**
   * Search and filter deployments
   */
  async searchDeployments(params: {
    status?: string;
    vpnType?: VpnType;
    region?: string;
    search?: string;
  }): Promise<DeployResponse[]> {
    const response = await api.get<DeployResponse[]>('/deploy/search', { params });
    return response.data;
  },

  /**
   * Test server connection
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/deploy/test/${id}`);
    return response.data;
  },

  /**
   * Health check
   */
  async healthCheck(id: string): Promise<HealthCheckResult> {
    const response = await api.post<HealthCheckResult>(`/deploy/health/${id}`);
    return response.data;
  },

  /**
   * Start service
   */
  async startService(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/deploy/start/${id}`);
    return response.data;
  },

  /**
   * Stop service
   */
  async stopService(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/deploy/stop/${id}`);
    return response.data;
  },

  /**
   * Restart service
   */
  async restartService(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/deploy/restart/${id}`);
    return response.data;
  },

  /**
   * Get service logs
   */
  async getLogs(id: string, lines: number = 100): Promise<string> {
    const response = await api.get<string>(`/deploy/logs/${id}`, {
      params: { lines },
    });
    return response.data;
  },

  /**
   * Execute custom command
   */
  async executeCommand(id: string, command: string): Promise<any> {
    const response = await api.post(`/deploy/command/${id}`, { command });
    return response.data;
  },

  /**
   * Update deployment
   */
  async updateDeployment(
    id: string,
    updates: {
      region?: string;
      nodeName?: string;
      expiryDate?: Date;
      autoRestart?: boolean;
      tags?: string;
    }
  ): Promise<DeployResponse> {
    const response = await api.put<DeployResponse>(`/deploy/${id}`, updates);
    return response.data;
  },

  /**
   * Delete deployment
   */
  async deleteDeployment(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/deploy/${id}`);
    return response.data;
  },

  /**
   * Batch restart
   */
  async batchRestart(ids: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const response = await api.post('/deploy/batch/restart', { ids });
    return response.data;
  },

  /**
   * Batch delete
   */
  async batchDelete(ids: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const response = await api.delete('/deploy/batch', { data: { ids } });
    return response.data;
  },

  /**
   * Batch health check
   */
  async batchHealthCheck(ids: string[]): Promise<Map<string, any>> {
    const response = await api.post<Map<string, any>>('/deploy/batch/health', { ids });
    return response.data;
  },
};

export default api;
