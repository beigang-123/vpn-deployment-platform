<template>
  <div class="log-console">
    <div class="console-header">
      <h4>
        <el-icon><Monitor /></el-icon>
        部署日志
      </h4>
      <div class="actions">
        <el-button size="small" @click="copyLogs" :disabled="logs.length === 0">
          <el-icon><DocumentCopy /></el-icon>
          复制
        </el-button>
        <el-button size="small" @click="clearLogs" :disabled="logs.length === 0">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>
    <div ref="logContainer" class="console-body">
      <div v-if="logs.length === 0" class="empty">
        <el-empty description="暂无日志" :image-size="80" />
      </div>
      <div
        v-for="log in logs"
        :key="log.id"
        :class="['log-entry', log.type || 'info']"
      >
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
    <div v-if="isDeploying" class="console-footer">
      <el-icon class="spinner"><Loading /></el-icon>
      <span>正在部署...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Monitor, DocumentCopy, Delete, Loading } from '@element-plus/icons-vue';
import { useDeployStore } from '@/stores/deploy';
import type { DeployLog } from '@/stores/deploy';

const deployStore = useDeployStore();

const logContainer = ref<HTMLElement>();

const logs = computed(() => deployStore.logs);
const isDeploying = computed(() => deployStore.deployStatus === 'deploying');

// Auto-scroll to bottom when new logs arrive
watch(
  logs,
  () => {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  },
  { deep: true }
);

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const copyLogs = () => {
  const logText = logs.value
    .map((log) => `[${formatTime(log.timestamp)}] ${log.message}`)
    .join('\n');

  navigator.clipboard
    .writeText(logText)
    .then(() => {
      ElMessage.success('日志已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制失败');
    });
};

const clearLogs = () => {
  deployStore.clearLogs();
  ElMessage.info('日志已清空');
};
</script>

<style scoped>
.log-console {
  border: 1px solid #e5e5e7;
  border-radius: 12px;
  overflow: hidden;
  background: #1e1e1e;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
  color: #e0e0e0;
}

.console-header h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.console-header .actions {
  display: flex;
  gap: 8px;
}

.console-body {
  height: 400px;
  overflow-y: auto;
  padding: 12px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.console-body::-webkit-scrollbar {
  width: 8px;
}

.console-body::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.console-body::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.console-body::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
}

.log-entry {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  word-break: break-all;
}

.log-time {
  color: #858585;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
}

.log-entry.info .log-message {
  color: #e0e0e0;
}

.log-entry.success .log-message {
  color: #34c759;
}

.log-entry.error .log-message {
  color: #ff3b30;
}

.console-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #2d2d2d;
  border-top: 1px solid #3e3e3e;
  color: #007aff;
  font-size: 13px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
