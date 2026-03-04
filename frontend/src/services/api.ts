import axios from 'axios';
import type { ServerInfo, VpnType, VpnConfig } from '@/stores/deploy';
import type { AuthResponse, LoginCredentials, RegisterData } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import router from '@/router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post<AuthResponse>(
            `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data;
          localStorage.setItem('access_token', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear auth and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          router.push('/login');
          ElMessage.error('登录已过期，请重新登录');
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        router.push('/login');
        ElMessage.error('请先登录');
        return Promise.reject(error);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      ElMessage.error('无权访问');
    } else if (error.response?.status === 500) {
      ElMessage.error('服务器错误，请稍后重试');
    } else if (error.response?.status === 503) {
      ElMessage.error('服务暂时不可用');
    }

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

// Authentication API
export const authApi = {
  /**
   * Login
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default api;
