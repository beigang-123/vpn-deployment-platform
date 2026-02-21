<template>
  <div class="server-management">
    <div class="header">
      <div class="header-content">
        <div class="title">
          <h2>部署管理</h2>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" @click="loadDeployments" :loading="loading">刷新</el-button>
          <el-button @click="toggleSelectAll" v-if="deployments.length > 0">
            {{ isAllSelected ? '取消全选' : '全选' }}
          </el-button>
          <el-button type="success" @click="batchHealthCheck" :disabled="selectedServers.length === 0">
            批量诊断 ({{ selectedServers.length }})
          </el-button>
          <el-button type="warning" @click="batchRestart" :disabled="selectedServers.length === 0">
            批量重启 ({{ selectedServers.length }})
          </el-button>
          <el-button type="danger" @click="batchDelete" :disabled="selectedServers.length === 0">
            批量删除 ({{ selectedServers.length }})
          </el-button>
          <el-button type="primary" @click="goToDeploy">
            <el-icon><Plus /></el-icon>
            新建部署
          </el-button>
        </div>
      </div>
    </div>

    <div class="main">
      <!-- Loading -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <!-- Empty -->
      <el-empty v-else-if="deployments.length === 0" description="暂无部署服务器">
        <el-button type="primary" @click="goToDeploy">立即部署</el-button>
      </el-empty>

      <!-- Server Grid -->
      <div v-else class="server-grid">
        <div v-for="server in deployments" :key="server.id" class="server-card" :class="{ 'selected': selectedServers.includes(server.id) }">
          <div class="card-checkbox">
            <el-checkbox v-model="selectedServers" :value="server.id" />
          </div>
          <div class="card-header">
            <div class="server-info">
              <el-icon class="server-icon" :color="getStatusColor(server.status)">
                <component :is="getStatusIcon(server.status)" />
              </el-icon>
              <div class="server-details">
                <h3>{{ server.nodeName || server.serverIp }}</h3>
                <span>{{ server.serverIp }}</span>
              </div>
            </div>
            <el-tag :type="getStatusType(server.status)">
              {{ getStatusText(server.status) }}
            </el-tag>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="label">状态:</span>
              <el-tag :type="getStatusType(server.status)" size="small">
                {{ getStatusText(server.status) }}
              </el-tag>
            </div>
            <div class="info-row">
              <span class="label">VPN类型:</span>
              <el-tag :type="getVpnTypeColor(server.vpnType)" size="small">
                {{ server.vpnType?.toUpperCase() }}
              </el-tag>
            </div>
            <div class="info-row">
              <span class="label">地区:</span>
              <span>{{ server.region || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">SSH端口:</span>
              <span>{{ server.sshPort }}</span>
            </div>
            <div class="info-row">
              <span class="label">部署时间:</span>
              <span class="time-text">{{ formatTime(server.createdAt) }}</span>
            </div>
            <div v-if="server.latency" class="info-row">
              <span class="label">延迟:</span>
              <span :class="getLatencyClass(server.latency)">
                {{ server.latency }} ms
              </span>
            </div>

            <!-- VPN Config -->
            <div v-if="server.configJson" class="vpn-config">
              <el-divider />
              <div class="info-row">
                <span class="label">端口:</span>
                <el-tag type="success" size="small">{{ server.configJson.port }}</el-tag>
              </div>
              <div class="info-row">
                <span class="label">UUID:</span>
                <el-text size="small" truncated>{{ server.configJson.uuid }}</el-text>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <el-button size="small" @click="viewConfig(server)" type="primary">配置</el-button>
            <el-button size="small" @click="checkHealth(server.id)">诊断</el-button>
            <el-dropdown @command="(cmd) => handleServerAction(cmd, server.id)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="restart">重启服务</el-dropdown-item>
                  <el-dropdown-item command="start">启动服务</el-dropdown-item>
                  <el-dropdown-item command="stop">停止服务</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 诊断结果对话框 -->
    <el-dialog
      v-model="diagnosisDialogVisible"
      title="连接诊断结果"
      width="600px"
      :close-on-click-modal="false"
    >
      <!-- 加载状态 -->
      <div v-if="diagnosingServerId" class="diagnosis-loading">
        <el-icon class="is-loading" :size="40">
          <Loading />
        </el-icon>
        <p>正在诊断连接，请稍候...</p>
      </div>

      <!-- 诊断结果 -->
      <div v-else-if="diagnosisResult" class="diagnosis-result">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="SSH连接">
            <el-tag :type="diagnosisResult.sshConnected ? 'success' : 'danger'">
              {{ diagnosisResult.sshConnected ? '✓ 正常' : '✗ 失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务运行状态">
            <el-tag :type="diagnosisResult.serviceRunning ? 'success' : 'danger'">
              {{ diagnosisResult.serviceRunning ? '✓ 运行中' : '✗ 未运行' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="端口可访问性">
            <el-tag :type="diagnosisResult.portAccessible ? 'success' : 'danger'">
              {{ diagnosisResult.portAccessible ? '✓ 可访问' : '✗ 不可访问' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="端口" v-if="diagnosisResult.port">
            {{ diagnosisResult.port }}
          </el-descriptions-item>
          <el-descriptions-item label="延迟" v-if="diagnosisResult.latency !== undefined">
            {{ diagnosisResult.latency >= 0 ? diagnosisResult.latency + ' ms' : '超时' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="diagnosisResult.error"
          :title="diagnosisResult.error"
          type="error"
          :closable="false"
          style="margin-top: 16px;"
        />
      </div>

      <template #footer>
        <el-button @click="diagnosisDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, SuccessFilled, WarningFilled, Clock, CircleCheckFilled, ArrowDown, Loading } from '@element-plus/icons-vue';
import { deployApi, type DeployResponse } from '@/services/api';

const router = useRouter();
const deployments = ref<DeployResponse[]>([]);
const loading = ref(false);
const selectedServers = ref<string[]>([]);

// 诊断结果对话框
const diagnosisDialogVisible = ref(false);
const diagnosisResult = ref<any>(null);
const diagnosingServerId = ref<string | null>(null);

// 全选状态
const isAllSelected = computed(() => {
  return deployments.value.length > 0 && selectedServers.value.length === deployments.value.length;
});

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedServers.value = [];
  } else {
    selectedServers.value = deployments.value.map(d => d.id);
  }
};

const loadDeployments = async () => {
  loading.value = true;
  try {
    deployments.value = await deployApi.getDeploymentList();
  } catch (error) {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDeployments();
});

const goToDeploy = () => {
  router.push('/');
};

const viewConfig = (server: DeployResponse) => {
  router.push(`/config?id=${server.id}`);
};

const deleteServer = async (id: string) => {
  ElMessageBox.confirm('确定删除？', '确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await deployApi.deleteDeployment(id);
      ElMessage.success('删除成功');
      await loadDeployments();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  }).catch(() => {});
};

const checkHealth = async (id: string) => {
  diagnosingServerId.value = id;
  diagnosisDialogVisible.value = true;
  diagnosisResult.value = null;

  try {
    const result = await deployApi.healthCheck(id);
    diagnosisResult.value = result;
  } catch (error) {
    diagnosisResult.value = {
      sshConnected: false,
      serviceRunning: false,
      portAccessible: false,
      error: '诊断失败',
    };
    ElMessage.error('诊断失败');
  } finally {
    diagnosingServerId.value = null;
  }
};

const handleServerAction = async (command: string, id: string) => {
  const actionMap: Record<string, () => Promise<any>> = {
    restart: () => deployApi.restartService(id),
    start: () => deployApi.startService(id),
    stop: () => deployApi.stopService(id),
    delete: () => deleteServer(id),
  };

  const action = actionMap[command];
  if (!action) return;

  const loading = ElMessage.info({
    message: '正在执行...',
    duration: 0,
  });

  try {
    const result = await action();
    loading.close();
    ElMessage.success(result.message || '操作成功');
    await loadDeployments();
  } catch (error: any) {
    loading.close();
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    deploying: 'warning',
    running: 'success',
    stopped: 'info',
    starting: 'warning',
    restarting: 'warning',
    error: 'danger',
    completed: 'success',
    failed: 'danger',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '等待中',
    deploying: '部署中',
    running: '运行中',
    stopped: '已停止',
    starting: '启动中',
    restarting: '重启中',
    error: '异常',
    completed: '已完成',
    failed: '失败',
  };
  return map[status] || status;
};

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: '#909399',
    deploying: '#E6A23C',
    running: '#67C23A',
    stopped: '#909399',
    starting: '#E6A23C',
    restarting: '#E6A23C',
    error: '#F56C6C',
    completed: '#67C23A',
    failed: '#F56C6C',
  };
  return map[status] || '#909399';
};

const getStatusIcon = (status: string) => {
  const map: Record<string, any> = {
    pending: Clock,
    deploying: WarningFilled,
    running: CircleCheckFilled,
    stopped: Clock,
    starting: WarningFilled,
    restarting: WarningFilled,
    error: WarningFilled,
    completed: CircleCheckFilled,
    failed: WarningFilled,
  };
  return map[status] || Clock;
};

const getVpnTypeColor = (type: string) => {
  const map: Record<string, string> = {
    v2ray: 'primary',
    xray: 'success',
  };
  return map[type] || 'info';
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  // 超过一周显示具体日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getLatencyClass = (latency: number) => {
  if (latency < 100) return 'latency-good';
  if (latency < 300) return 'latency-medium';
  return 'latency-poor';
};

const batchHealthCheck = async () => {
  if (selectedServers.value.length === 0) return;

  try {
    ElMessage.info(`正在批量诊断 ${selectedServers.value.length} 个服务器...`);

    const results = await deployApi.batchHealthCheck(selectedServers.value);

    // 统计诊断结果
    let healthyCount = 0;
    let unhealthyCount = 0;

    Object.entries(results).forEach(([id, result]: [string, any]) => {
      if (result.isHealthy) {
        healthyCount++;
      } else {
        unhealthyCount++;
      }
    });

    // 显示诊断结果
    if (unhealthyCount > 0) {
      ElMessage.warning({
        message: `诊断完成：${healthyCount} 个正常，${unhealthyCount} 个异常`,
        duration: 5000,
      });
    } else {
      ElMessage.success(`诊断完成：所有 ${healthyCount} 个服务器运行正常`);
    }

    // 刷新列表
    await loadDeployments();
  } catch (error) {
    console.error('Batch health check error:', error);
    ElMessage.error('批量诊断失败');
  }
};

const batchRestart = async () => {
  if (selectedServers.value.length === 0) return;

  try {
    const result = await deployApi.batchRestart(selectedServers.value);
    if (result.failed.length > 0) {
      ElMessage.warning(`重启 ${result.success.length} 个成功，${result.failed.length} 个失败`);
    } else {
      ElMessage.success(`成功重启 ${result.success.length} 个服务器`);
    }
    await loadDeployments();
  } catch (error) {
    ElMessage.error('批量重启失败');
  }
};

const batchDelete = async () => {
  if (selectedServers.value.length === 0) return;

  ElMessageBox.confirm(
    `确定删除选中的 ${selectedServers.value.length} 个服务器？`,
    '批量删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const result = await deployApi.batchDelete(selectedServers.value);
      selectedServers.value = [];
      if (result.failed.length > 0) {
        ElMessage.warning(`删除 ${result.success.length} 个成功，${result.failed.length} 个失败`);
      } else {
        ElMessage.success(`成功删除 ${result.success.length} 个服务器`);
      }
      await loadDeployments();
    } catch (error) {
      ElMessage.error('批量删除失败');
    }
  }).catch(() => {});
};
</script>

<style scoped>
.server-management {
  min-height: 100vh;
  background: #f5f5f7;
  padding-top: 80px;
}

.header {
  background: white;
  border-bottom: 1px solid #e5e5e7;
  padding: 16px 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.title h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.loading-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.server-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e5e7;
  transition: all 0.2s;
  position: relative;
}

.server-card.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  background: white;
  border-radius: 4px;
  padding: 4px;
}

.server-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f7;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.server-icon {
  font-size: 24px;
}

.server-details h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
}

.server-details span {
  font-size: 13px;
  color: #86868b;
}

.card-body {
  padding: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.label {
  font-size: 14px;
  color: #86868b;
}

.vpn-config {
  margin-top: 8px;
}

.time-text {
  font-size: 13px;
  color: #666;
}

.latency-good {
  color: #67c23a;
  font-weight: 500;
}

.latency-medium {
  color: #e6a23c;
  font-weight: 500;
}

.latency-poor {
  color: #f56c6c;
  font-weight: 500;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f9f9f9;
  border-top: 1px solid #f5f5f7;
}

/* 诊断对话框样式 */
.diagnosis-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #606266;
}

.diagnosis-loading .el-icon {
  color: #409eff;
  margin-bottom: 16px;
}

.diagnosis-loading p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.diagnosis-result {
  padding: 8px 0;
}
</style>
