<template>
  <div class="deploy-list">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <div class="title">
            <el-icon><List /></el-icon>
            <h2>部署历史</h2>
          </div>
          <div class="header-actions">
            <el-button :icon="Refresh" @click="loadDeployments" :loading="loading">刷新</el-button>
            <el-button type="primary" @click="goToDeploy">
              <el-icon><Plus /></el-icon>
              新建部署
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main class="main">
        <!-- Loading state -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- Empty state -->
        <el-empty v-else-if="deployments.length === 0" description="暂无部署记录">
          <el-button type="primary" @click="goToDeploy">立即部署</el-button>
        </el-empty>

        <!-- Data table -->
        <el-table v-else :data="deployments" stripe style="width: 100%" v-loading="loading">
          <el-table-column prop="serverIp" label="服务器 IP" width="140" />
          <el-table-column prop="sshPort" label="SSH端口" width="100" />
          <el-table-column prop="vpnType" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.vpnType === 'v2ray' ? 'primary' : 'success'">
                {{ row.vpnType ? row.vpnType.toUpperCase() : '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag
                :type="getStatusType(row.status)"
                effect="plain"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="部署时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="viewDetail(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button
                v-if="row.status === 'completed'"
                size="small"
                type="success"
                @click="viewConfig(row)"
              >
                <el-icon><Download /></el-icon>
                配置
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="部署详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedDeployment" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="服务器 IP">
            {{ selectedDeployment.serverIp }}
          </el-descriptions-item>
          <el-descriptions-item label="SSH 端口">
            {{ selectedDeployment.sshPort }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ selectedDeployment.username }}
          </el-descriptions-item>
          <el-descriptions-item label="VPN 类型">
            <el-tag :type="selectedDeployment.vpnType === 'v2ray' ? 'primary' : 'success'">
              {{ selectedDeployment.vpnType ? selectedDeployment.vpnType.toUpperCase() : '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="部署状态">
            <el-tag :type="getStatusType(selectedDeployment.status)">
              {{ getStatusText(selectedDeployment.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="部署时间" :span="2">
            {{ formatDate(selectedDeployment.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div v-if="selectedDeployment.configJson && selectedDeployment.status === 'completed'" class="config-section">
          <h3>
            <el-icon><Connection /></el-icon>
            连接信息
          </h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="服务器地址">
              {{ selectedDeployment.configJson.address }}
            </el-descriptions-item>
            <el-descriptions-item label="端口">
              <el-tag type="success">{{ selectedDeployment.configJson.port }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="UUID">
              <el-tag type="warning">{{ selectedDeployment.configJson.uuid }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="协议">
              {{ selectedDeployment.configJson.protocol.toUpperCase() }}
            </el-descriptions-item>
            <el-descriptions-item label="分享链接">
              <el-input
                :model="selectedDeployment.configJson.shareLink"
                type="textarea"
                :rows="2"
                readonly
              >
                <template #append>
                  <el-button @click="copyShareLink(selectedDeployment.configJson.shareLink)">
                    复制
                  </el-button>
                </template>
              </el-input>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="selectedDeployment.errorMessage" class="error-section">
          <h3>
            <el-icon><Warning /></el-icon>
            错误信息
          </h3>
          <el-alert
            :title="selectedDeployment.errorMessage"
            type="error"
            :closable="false"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { List, Plus, View, Download, Connection, Warning, Refresh } from '@element-plus/icons-vue';
import { deployApi } from '@/services/api';
import type { DeployResponse } from '@/services/api';

const router = useRouter();

const deployments = ref<DeployResponse[]>([]);
const detailDialogVisible = ref(false);
const selectedDeployment = ref<DeployResponse | null>(null);
const loading = ref(true);

// Load deployments
const loadDeployments = async () => {
  loading.value = true;
  try {
    deployments.value = await deployApi.getDeploymentList();
  } catch (error) {
    ElMessage.error('加载部署列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDeployments();
});

const goToDeploy = () => {
  router.push('/').catch((err) => {
    console.error('Navigation error:', err);
  });
};

const viewDetail = (row: DeployResponse) => {
  selectedDeployment.value = row;
  detailDialogVisible.value = true;
};

const viewConfig = (row: DeployResponse) => {
  router.push(`/config?id=${row.id}`);
};

const copyShareLink = (link: string) => {
  navigator.clipboard.writeText(link).then(() => {
    ElMessage.success('分享链接已复制');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
};

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'info',
    deploying: 'warning',
    completed: 'success',
    failed: 'danger',
  };
  return statusMap[status] || 'info';
};

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '等待中',
    deploying: '部署中',
    completed: '已完成',
    failed: '失败',
  };
  return textMap[status] || status;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN');
};
</script>

<style scoped>
.deploy-list {
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
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.title h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.detail-content {
  padding: 8px 0;
}

.config-section,
.error-section {
  margin-top: 24px;
}

.config-section h3,
.error-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
