<template>
  <div class="config-download">
    <el-container>
      <el-main>
        <div class="config-container">
          <div class="header">
            <h1>VPN 配置</h1>
            <p>下载配置或扫描二维码以连接您的 VPN</p>
          </div>

          <el-alert
            v-if="loading"
            title="加载中..."
            type="info"
            :closable="false"
            show-icon
          />

          <el-alert
            v-else-if="!config"
            title="未找到配置"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              请先完成部署流程。
              <el-button type="primary" link @click="goToDeploy">前往部署</el-button>
            </template>
          </el-alert>

          <div v-else class="config-content">
            <!-- 分享链接（最重要！） -->
            <div class="share-link-section">
              <div class="share-link-header">
                <el-icon class="header-icon" color="#67c23a"><Share /></el-icon>
                <span class="header-title">V2Ray 订阅链接</span>
                <el-tag type="success" size="small" effect="plain">推荐</el-tag>
              </div>

              <div class="share-link-content">
                <div class="link-input-wrapper">
                  <el-input
                    :model-value="config.shareLink"
                    readonly
                    size="large"
                    class="share-link-input"
                  >
                    <template #append>
                      <el-button type="primary" @click="copyShareLink" size="large">
                        <el-icon style="margin-right: 4px;"><DocumentCopy /></el-icon>
                        复制
                      </el-button>
                    </template>
                  </el-input>
                </div>

                <div class="supported-clients">
                  <span class="clients-label">支持客户端：</span>
                  <div class="clients-list">
                    <el-tag size="small" effect="plain">v2rayN</el-tag>
                    <el-tag size="small" effect="plain">V2RayNG</el-tag>
                    <el-tag size="small" effect="plain">Shadowrocket</el-tag>
                    <el-tag size="small" effect="plain">Qv2ray</el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- Clash 订阅链接 -->
            <div class="share-link-section" style="background: linear-gradient(135deg, #fff7e6 0%, #fff1b8 100%); border-color: #ffd591;">
              <div class="share-link-header">
                <el-icon class="header-icon" color="#faad14"><Connection /></el-icon>
                <span class="header-title">Clash 订阅链接</span>
                <el-tag type="warning" size="small" effect="plain">一键导入</el-tag>
              </div>

              <div class="share-link-content">
                <div class="link-input-wrapper">
                  <el-input
                    :model-value="clashSubscribeUrl"
                    readonly
                    size="large"
                    class="share-link-input"
                  >
                    <template #append>
                      <el-button type="warning" @click="copyClashLink" size="large">
                        <el-icon style="margin-right: 4px;"><DocumentCopy /></el-icon>
                        复制
                      </el-button>
                    </template>
                  </el-input>
                </div>

                <div class="supported-clients">
                  <span class="clients-label">支持客户端：</span>
                  <div class="clients-list">
                    <el-tag size="small" effect="plain">Clash</el-tag>
                    <el-tag size="small" effect="plain">Clash Verge</el-tag>
                    <el-tag size="small" effect="plain">ClashX</el-tag>
                    <el-tag size="small" effect="plain">Clash for Android</el-tag>
                  </div>
                </div>

                <el-alert
                  type="info"
                  :closable="false"
                  style="margin-top: 12px;"
                  show-icon
                >
                  <template #default>
                    <div style="font-size: 13px;">
                      复制链接后，在 Clash 客户端中选择<strong>"配置"</strong> → <strong>"新建"</strong> → <strong>"从剪贴板导入"</strong>
                    </div>
                  </template>
                </el-alert>
              </div>
            </div>

            <!-- 二维码 -->
            <el-alert
              title="扫描二维码快速导入"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 24px;"
            >
              <template #default>
                <div style="text-align: center;">
                  <canvas ref="qrcodeCanvas" style="border: 1px solid #e5e5e7; border-radius: 8px; padding: 16px; background: white;"></canvas>
                  <p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">
                    使用V2Ray客户端扫描二维码即可导入配置
                  </p>
                </div>
              </template>
            </el-alert>

            <!-- Connection Info Section -->
            <div class="info-section">
              <div class="info-card">
                <h3>连接信息</h3>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="服务器地址">
                    <el-tag type="danger" size="large">{{ config.address }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="端口">
                    <el-tag type="success" size="large">{{ config.port }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="UUID">
                    <el-tag type="warning" size="large">{{ config.uuid }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="协议">
                    <el-tag type="info" size="large">{{ config.protocol?.toUpperCase() }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>

            <!-- Download Section -->
            <div class="download-section">
              <div class="download-card">
                <h3>下载配置文件</h3>
                <div class="download-buttons">
                  <el-button type="primary" size="large" @click="downloadJson">
                    <el-icon><Document /></el-icon>
                    下载 V2Ray 配置
                  </el-button>
                  <el-button type="warning" size="large" @click="downloadClash" :loading="downloadingClash">
                    <el-icon><Connection /></el-icon>
                    下载 Clash 配置
                  </el-button>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="actions">
              <el-button size="large" type="warning" @click="diagnoseConnection" :loading="diagnosing">
                <el-icon><Search /></el-icon>
                诊断连接
              </el-button>
              <el-button size="large" type="success" @click="openFirewallPort" :loading="openingPort">
                <el-icon><Unlock /></el-icon>
                开放端口
              </el-button>
              <el-button size="large" @click="goToDeploy">
                返回部署
              </el-button>
            </div>

            <!-- 诊断结果 -->
            <el-dialog v-model="showDiagnosis" title="连接诊断结果" width="600px">
              <!-- 加载状态 -->
              <div v-if="diagnosing" class="diagnosis-loading">
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
                  <el-descriptions-item label="V2Ray服务状态">
                    <el-tag :type="diagnosisResult.serviceRunning ? 'success' : 'danger'">
                      {{ diagnosisResult.serviceRunning ? '✓ 运行中' : '✗ 未运行' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="端口可访问性">
                    <el-tag :type="diagnosisResult.portAccessible ? 'success' : 'danger'">
                      {{ diagnosisResult.portAccessible ? '✓ 可访问' : '✗ 不可访问' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="端口">
                    {{ config.port || diagnosisResult.port || '未知' }}
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

                <div v-if="diagnosisResult && !diagnosisResult.serviceRunning" style="margin-top: 16px;">
                  <el-alert
                    title="V2Ray服务未运行"
                    type="warning"
                    :closable="false"
                    style="margin-bottom: 12px;"
                  >
                    请登录服务器执行以下命令启动服务：
                    <pre style="margin-top: 8px; padding: 8px; background: #f5f5f7; border-radius: 4px;">systemctl start v2ray
systemctl status v2ray</pre>
                  </el-alert>
                </div>

                <div v-if="diagnosisResult && !diagnosisResult.portAccessible" style="margin-top: 16px;">
                  <el-alert
                    title="端口不可访问"
                    type="warning"
                    :closable="false"
                  >
                    <p>可能原因：</p>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                      <li>服务器防火墙未开放端口 {{ config?.port }}</li>
                      <li>云服务商安全组未开放端口</li>
                    </ul>
                    <p>解决方法：</p>
                    <pre style="margin-top: 8px; padding: 8px; background: #f5f5f7; border-radius: 4px;"># 开放防火墙端口
firewall-cmd --permanent --add-port={{ config?.port }}/tcp
firewall-cmd --reload

# 或使用 ufw
ufw allow {{ config?.port }}/tcp</pre>
                  </el-alert>
                </div>
              </div>
            </el-dialog>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Share,
  DocumentCopy,
  Search,
  Unlock,
  Document,
  Connection,
  Loading,
} from '@element-plus/icons-vue';
import * as QRCode from 'qrcode';

const router = useRouter();

const config = ref<any>(null);
const loading = ref(true);
const serverIp = ref('');
const deploymentId = ref('');
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null);

// Clash 订阅链接
const clashSubscribeUrl = computed(() => {
  if (!deploymentId.value) return '';
  // 使用当前域名和端口生成订阅链接
  const baseUrl = window.location.origin;
  return `${baseUrl}/api/deploy/clash/${deploymentId.value}`;
});

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (id) {
    deploymentId.value = id;
    await loadConfig(id);
  } else {
    loading.value = false;
  }
});

const loadConfig = async (id: string) => {
  loading.value = true;
  try {
    const response = await fetch(`/api/deploy/${id}`);
    const deployment = await response.json();

    if (deployment && deployment.configJson) {
      config.value = deployment.configJson;
      serverIp.value = deployment.serverIp;
    } else {
      ElMessage.error('配置不存在');
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    ElMessage.error('加载配置失败');
  } finally {
    loading.value = false;
  }
};

const generateQRCode = async () => {
  if (!config.value?.shareLink) {
    return;
  }

  if (!qrcodeCanvas.value) {
    return;
  }

  try {
    await QRCode.toCanvas(qrcodeCanvas.value, config.value.shareLink, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    // Handle QR code generation error
  }
};

// 监听 config 和 canvas，当两者都准备好时生成二维码
watch([config, qrcodeCanvas], async () => {
  if (config.value?.shareLink && qrcodeCanvas.value) {
    await nextTick();
    generateQRCode();
  }
});

const copyShareLink = () => {
  if (!config.value) return;

  navigator.clipboard
    .writeText(config.value.shareLink)
    .then(() => {
      ElMessage.success('V2Ray 订阅链接已复制');
    })
    .catch(() => {
      ElMessage.error('复制失败');
    });
};

const copyClashLink = () => {
  if (!clashSubscribeUrl.value) return;

  navigator.clipboard
    .writeText(clashSubscribeUrl.value)
    .then(() => {
      ElMessage.success('Clash 订阅链接已复制');
    })
    .catch(() => {
      ElMessage.error('复制失败');
    });
};

const downloadJson = () => {
  if (!config.value) return;

  const json = JSON.stringify(config.value.clientConfig, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vpn-config-${config.value.address}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  ElMessage.success('配置已下载');
};

// 下载 Clash 配置
const downloadingClash = ref(false);

const downloadClash = async () => {
  if (!deploymentId.value) return;

  downloadingClash.value = true;

  try {
    const response = await fetch(`/api/deploy/clash/${deploymentId.value}`);

    if (!response.ok) {
      throw new Error('获取 Clash 配置失败');
    }

    const clashConfig = await response.text();

    const blob = new Blob([clashConfig], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clash-${config.value.address}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success('Clash 配置已下载');
  } catch (error: any) {
    console.error('Download Clash config error:', error);
    ElMessage.error(`下载 Clash 配置失败: ${error.message || '未知错误'}`);
  } finally {
    downloadingClash.value = false;
  }
};

const goToDeploy = () => {
  router.push('/');
};

// 诊断连接
const diagnosing = ref(false);
const showDiagnosis = ref(false);
const diagnosisResult = ref<any>(null);

// 开放端口
const openingPort = ref(false);

const openFirewallPort = async () => {
  if (!deploymentId.value) return;

  openingPort.value = true;

  try {
    const response = await fetch(`http://localhost:3001/api/deploy/open-port/${deploymentId.value}`, {
      method: 'POST',
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        ElMessage.success({
          message: result.message,
          duration: 5000,
        });

        // 3秒后自动重新诊断
        setTimeout(() => {
          diagnoseConnection();
        }, 3000);
      } else {
        ElMessage.error({
          message: result.message || '开放端口失败',
          duration: 5000,
        });
      }
    } else {
      ElMessage.error('开放端口请求失败');
    }
  } catch (error: any) {
    console.error('Open port error:', error);
    ElMessage.error(`开放端口失败: ${error.message || '未知错误'}`);
  } finally {
    openingPort.value = false;
  }
};

const diagnoseConnection = async () => {
  if (!deploymentId.value) return;

  diagnosing.value = true;
  showDiagnosis.value = true;
  diagnosisResult.value = null;

  try {
    // 使用 AbortController 设置60秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`/api/deploy/health/${deploymentId.value}`, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      diagnosisResult.value = await response.json();
    } else {
      diagnosisResult.value = {
        sshConnected: false,
        serviceRunning: false,
        portAccessible: false,
        error: '诊断请求失败',
      };
    }
  } catch (error: any) {
    console.error('Diagnosis error:', error);

    if (error.name === 'AbortError') {
      diagnosisResult.value = {
        sshConnected: false,
        serviceRunning: false,
        portAccessible: false,
        error: '诊断超时，服务器响应时间过长',
      };
      ElMessage.warning('诊断超时，请稍后重试');
    } else {
      diagnosisResult.value = {
        sshConnected: false,
        serviceRunning: false,
        portAccessible: false,
        error: error.message || '诊断失败',
      };
    }
  } finally {
    diagnosing.value = false;
  }
};
</script>

<style scoped>
.config-download {
  min-height: 100vh;
  background: #f5f5f7;
}

.config-container {
  max-width: 1000px;
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
}

.header p {
  font-size: 17px;
  color: #86868b;
  margin: 0;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 分享链接区域 */
.share-link-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e8f5e9 100%);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #c6f6d5;
  margin-bottom: 24px;
}

.share-link-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.header-icon {
  font-size: 24px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  flex: 1;
}

.share-link-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.link-input-wrapper {
  width: 100%;
}

.share-link-input {
  width: 100%;
}

.share-link-input :deep(.el-input__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #2c3e50;
}

.supported-clients {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
}

.clients-label {
  font-size: 13px;
  color: #666;
  margin-right: 4px;
}

.clients-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.clients-list .el-tag {
  background: white;
  border-color: #e5e5e7;
  color: #606266;
}

.info-section,
.download-section {
  width: 100%;
}

.info-card,
.download-card {
  background: #f5f5f7;
  border-radius: 14px;
  padding: 28px;
  border: 1px solid #e5e5e7;
}

.info-card h3,
.download-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: #1d1d1f;
}

.share-link .el-text {
  margin-bottom: 8px;
  font-size: 14px;
  color: #1d1d1f;
  font-weight: 500;
}

.download-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 32px;
  border-top: 1px solid #e5e5e7;
  margin-top: 32px;
}

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

.diagnosis-result pre {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
