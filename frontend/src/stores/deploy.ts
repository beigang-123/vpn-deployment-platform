import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

export type VpnType = 'v2ray' | 'xray';
export type DeployStatus = 'idle' | 'deploying' | 'completed' | 'failed';

export interface ServerInfo {
  serverIp: string;
  sshPort: number;
  username: string;
  password: string;
  privateKey?: string;
}

export interface VpnConfig {
  address: string;
  port: number;
  uuid: string;
  protocol: string;
  network: string;
  security: string;
  shareLink: string;
  clientConfig: any;
}

export interface DeployLog {
  id: string;
  timestamp: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}

export const useDeployStore = defineStore('deploy', () => {
  // State
  const serverInfo = reactive<ServerInfo>({
    serverIp: '',
    sshPort: 22,
    username: 'root',
    password: '',
    privateKey: '',
  });

  const vpnType = ref<VpnType>('v2ray');
  const deployStatus = ref<DeployStatus>('idle');
  const logs = ref<DeployLog[]>([]);
  const config = ref<VpnConfig | null>(null);
  const deploymentId = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);

  // Actions
  const setServerInfo = (info: Partial<ServerInfo>) => {
    Object.assign(serverInfo, info);
  };

  const setVpnType = (type: VpnType) => {
    vpnType.value = type;
  };

  const setDeployStatus = (status: DeployStatus) => {
    deployStatus.value = status;
  };

  const addLog = (message: string, type: DeployLog['type'] = 'info') => {
    const log: DeployLog = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    logs.value.push(log);
  };

  const clearLogs = () => {
    logs.value = [];
  };

  const setConfig = (newConfig: VpnConfig) => {
    config.value = newConfig;
  };

  const setDeploymentId = (id: string | null) => {
    deploymentId.value = id;
  };

  const setError = (error: string | null) => {
    errorMessage.value = error;
  };

  const reset = () => {
    deployStatus.value = 'idle';
    logs.value = [];
    config.value = null;
    deploymentId.value = null;
    errorMessage.value = null;
  };

  return {
    // State
    serverInfo,
    vpnType,
    deployStatus,
    logs,
    config,
    deploymentId,
    errorMessage,
    // Actions
    setServerInfo,
    setVpnType,
    setDeployStatus,
    addLog,
    clearLogs,
    setConfig,
    setDeploymentId,
    setError,
    reset,
  };
});
