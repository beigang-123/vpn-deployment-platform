import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    name: 'DeployWizard',
    component: () => import('@/views/DeployWizard.vue'),
    meta: { title: '部署向导', requiresAuth: true },
  },
  {
    path: '/config',
    name: 'ConfigDownload',
    component: () => import('@/views/ConfigDownload.vue'),
    meta: { title: '配置下载', requiresAuth: true },
  },
  {
    path: '/management',
    name: 'ServerManagement',
    component: () => import('@/views/ServerManagement.vue'),
    meta: { title: '部署管理', requiresAuth: true },
  },
  {
    path: '/history',
    name: 'DeployList',
    component: () => import('@/views/DeployList.vue'),
    meta: { title: '部署历史', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  // Load user from storage if not already loaded
  if (!authStore.user && authStore.token) {
    authStore.loadUserFromStorage();
  }

  const requiresAuth = to.meta.requiresAuth !== false; // Default to true

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if authentication is required
    next({
      name: 'Login',
      query: { redirect: to.fullPath },
    });
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    // Redirect to home if already authenticated
    next({ name: 'DeployWizard' });
  } else {
    next();
  }
});

// Set page title
router.afterEach((to) => {
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} - VPN 一键部署平台`;
  }
});

// Navigation error handling
router.onError((error) => {
  console.error('Router error:', error);
});

export default router;
