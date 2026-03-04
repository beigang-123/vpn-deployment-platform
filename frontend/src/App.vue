<template>
  <el-config-provider :locale="locale">
    <div class="app-container">
      <div v-if="authStore.isAuthenticated" class="nav-menu">
        <router-link to="/" class="nav-item" :class="{ active: route.path === '/' || route.path.startsWith('/config') }">
          <el-icon><Position /></el-icon>
          部署向导
        </router-link>
        <router-link to="/management" class="nav-item" :class="{ active: route.path === '/management' }">
          <el-icon><Monitor /></el-icon>
          部署管理
        </router-link>
        <router-link to="/history" class="nav-item" :class="{ active: route.path === '/history' }">
          <el-icon><List /></el-icon>
          部署历史
        </router-link>

        <div class="nav-spacer"></div>

        <div class="user-menu">
          <el-dropdown>
            <div class="user-info">
              <el-icon><User /></el-icon>
              <span>{{ authStore.currentUser?.name || authStore.currentUser?.email || '用户' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ authStore.currentUser?.email }}
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div class="content-wrapper">
        <router-view :key="$route.fullPath" />
      </div>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { provide, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import pinia from './stores';
import { useAuthStore } from './stores/auth';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import { Position, List, Monitor, User, SwitchButton } from '@element-plus/icons-vue';

const locale = zhCn;
const route = useRoute();
const authStore = useAuthStore();

provide('pinia', pinia);

// Load user from storage on mount
onMounted(() => {
  if (authStore.token && !authStore.user) {
    authStore.loadUserFromStorage();
  }
});

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await authStore.logout();
  } catch (error) {
    // User cancelled
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 15px;
  color: #1d1d1f;
  background: #f5f5f7;
}

#app {
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
}

.nav-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
  height: 60px;
  gap: 8px;
  border-bottom: 1px solid #e5e5e7;
}

.nav-spacer {
  flex: 1;
}

.user-menu {
  margin-left: auto;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.user-info:hover {
  background-color: #f5f5f7;
}

.user-info span {
  font-size: 14px;
  font-weight: 500;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #1d1d1f;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  text-decoration: none;
}

.nav-item:hover {
  background-color: #f5f5f7;
  color: #007aff;
}

.nav-item.active {
  color: #007aff;
  background-color: #f5f5f7;
}

.nav-item .el-icon {
  font-size: 18px;
}

/* Element Plus 苹果风格覆盖 */
.el-button--primary {
  background-color: #007aff;
  border-color: #007aff;
}

.el-button--primary:hover {
  background-color: #0051d5;
  border-color: #0051d5;
}

.el-button--success {
  background-color: #34c759;
  border-color: #34c759;
}

.el-button--success:hover {
  background-color: #28a745;
  border-color: #28a745;
}

.el-button--danger {
  background-color: #ff3b30;
  border-color: #ff3b30;
}

.el-button--danger:hover {
  background-color: #d62926;
  border-color: #d62926;
}

.el-tag {
  border-radius: 6px;
}

.el-input__wrapper {
  border-radius: 8px;
}

.el-input-number .el-input__wrapper {
  border-radius: 8px;
}

.el-textarea__inner {
  border-radius: 8px;
}

.el-steps {
  --el-process-text-color: #007aff;
}

.el-step__head.is-process {
  color: #007aff;
  border-color: #007aff;
}

.el-step__line {
  background-color: #e5e5e7;
}

.el-result__title {
  color: #1d1d1f;
  font-weight: 600;
}

.el-result__subtitle {
  color: #86868b;
}

.el-alert__title {
  font-weight: 500;
}
</style>
