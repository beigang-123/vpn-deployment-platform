<template>
  <div class="deploy-wizard">
    <el-container>
      <el-main>
        <div class="wizard-container">
          <div class="header">
            <h1>VPN 一键部署</h1>
            <p>在您的服务器上快速部署 V2Ray/Xray 服务</p>
          </div>

          <el-steps :active="currentStep" finish-status="success" align-center class="steps">
            <el-step title="服务器信息" />
            <el-step title="选择类型" />
            <el-step title="正在部署" />
            <el-step title="完成" />
          </el-steps>

          <div class="wizard-content">
            <!-- Step 1: Server Information -->
            <div v-show="currentStep === 0" class="step-content">
              <h2>输入服务器信息</h2>
              <p class="step-description">
                请提供您服务器的 SSH 连接信息
              </p>
              <ServerForm ref="serverFormRef" />
            </div>

            <!-- Step 2: VPN Type Selection -->
            <div v-show="currentStep === 1" class="step-content">
              <h2>选择 VPN 类型</h2>
              <p class="step-description">
                选择您要部署的 VPN 软件
              </p>
              <VpnTypeSelector v-model="vpnType" />
            </div>

            <!-- Step 3: Deploying -->
            <div v-show="currentStep === 2" class="step-content">
              <h2>正在部署</h2>
              <p class="step-description">
                正在您的服务器上部署 {{ vpnType === 'v2ray' ? 'V2Ray' : 'Xray' }}，请稍候...
              </p>
              <LogConsole />
            </div>

            <!-- Step 4: Complete -->
            <div v-show="currentStep === 3" class="step-content">
              <el-result
                icon="success"
                title="部署完成"
                sub-title="您的 VPN 已成功部署"
              >
                <template #extra>
                  <el-button type="primary" @click="goToConfig">
                    查看配置
                  </el-button>
                  <el-button @click="goToHistory">查看历史</el-button>
                  <el-button @click="startNew">再次部署</el-button>
                </template>
              </el-result>
            </div>
          </div>

          <div class="wizard-actions">
            <el-button v-if="currentStep > 0 && currentStep < 3" @click="prevStep">
              <el-icon><ArrowLeft /></el-icon>
              上一步
            </el-button>
            <el-button
              v-if="currentStep < 2"
              type="primary"
              :loading="isLoading"
              @click="nextStep"
            >
              {{ currentStep === 1 ? '开始部署' : '下一步' }}
              <el-icon v-if="currentStep < 1"><ArrowRight /></el-icon>
            </el-button>
            <el-button
              v-if="currentStep === 2 && deployStatus === 'failed'"
              type="danger"
              @click="retryDeployment"
            >
              <el-icon><RefreshRight /></el-icon>
              重试
            </el-button>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight, RefreshRight } from '@element-plus/icons-vue';
import ServerForm from '@/components/ServerForm.vue';
import VpnTypeSelector from '@/components/VpnTypeSelector.vue';
import LogConsole from '@/components/LogConsole.vue';
import { useDeployStore } from '@/stores/deploy';
import { socketService } from '@/services/socket';
import type { VpnType } from '@/stores/deploy';

const router = useRouter();
const deployStore = useDeployStore();

const currentStep = ref(0);
const isLoading = ref(false);
const serverFormRef = ref();

const vpnType = computed({
  get: () => deployStore.vpnType,
  set: (value: VpnType) => deployStore.setVpnType(value),
});

const deployStatus = computed(() => deployStore.deployStatus);

// Setup socket listeners
onMounted(async () => {
  try {
    // Only connect if not already connected
    if (!socketService.isConnected()) {
      await socketService.connect();
    }
    setupSocketListeners();
  } catch (error) {
    console.error('Failed to connect to WebSocket:', error);
  }
});

onUnmounted(() => {
  socketService.removeAllListeners();
  // Don't disconnect on unmount to allow reuse
});

const setupSocketListeners = () => {
  socketService.onDeployStart((data) => {
    deployStore.setDeploymentId(data.deploymentId);
    deployStore.addLog(data.message, 'info');
  });

  socketService.onDeployLog((data) => {
    deployStore.addLog(data.log, 'info');
  });

  socketService.onDeployComplete((data) => {
    deployStore.setConfig(data.config);
    deployStore.setDeployStatus('completed');
    deployStore.addLog('Deployment completed successfully!', 'success');
    isLoading.value = false;
    setTimeout(() => {
      currentStep.value = 3;
    }, 1000);
  });

  socketService.onDeployError((data) => {
    deployStore.setError(data.error);
    deployStore.setDeployStatus('failed');
    deployStore.addLog(`Error: ${data.error}`, 'error');
    isLoading.value = false;
    ElMessage.error(data.error);
  });
};

const nextStep = async () => {
  if (currentStep.value === 0) {
    // Validate server form
    const isValid = await serverFormRef.value?.validate();
    if (!isValid) return;
  }

  if (currentStep.value === 1) {
    // Start deployment
    await startDeployment();
    return;
  }

  currentStep.value++;
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const startDeployment = async () => {
  isLoading.value = true;
  deployStore.reset();
  currentStep.value = 2;

  const { serverInfo, vpnType } = deployStore;

  try {
    socketService.startDeploy(serverInfo, vpnType);
    deployStore.setDeployStatus('deploying');
    deployStore.addLog('Starting deployment process...', 'info');
  } catch (error: any) {
    isLoading.value = false;
    ElMessage.error(error.message || 'Failed to start deployment');
    currentStep.value = 1;
  }
};

const retryDeployment = async () => {
  await startDeployment();
};

const goToConfig = () => {
  const deploymentId = deployStore.deploymentId;
  if (!deploymentId) {
    ElMessage.error('未找到部署ID');
    return;
  }
  router.push(`/config?id=${deploymentId}`).catch((err) => {
    console.error('Navigation error:', err);
  });
};

const goToHistory = () => {
  router.push('/history').catch((err) => {
    console.error('Navigation error:', err);
  });
};

const startNew = () => {
  deployStore.reset();
  currentStep.value = 0;
  serverFormRef.value?.reset();
};
</script>

<style scoped>
.deploy-wizard {
  min-height: 100vh;
  background: #f5f5f7;
}

.wizard-container {
  max-width: 900px;
  margin: 0 auto;
  margin-top: 60px;
  background: white;
  border-radius: 18px;
  padding: 48px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
}

.header {
  text-align: center;
  margin-bottom: 48px;
}

.header h1 {
  font-size: 36px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1d1d1f;
  letter-spacing: -0.5px;
}

.header p {
  font-size: 17px;
  color: #86868b;
  margin: 0;
  font-weight: 400;
}

.steps {
  margin-bottom: 48px;
}

.wizard-content {
  min-height: 400px;
  margin-bottom: 32px;
}

.step-content {
  padding: 20px 0;
}

.step-content h2 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

.step-description {
  font-size: 15px;
  color: #86868b;
  margin: 0 0 30px 0;
  font-weight: 400;
}

.wizard-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e5e7;
}
</style>
