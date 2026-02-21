import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'DeployWizard',
    component: () => import('@/views/DeployWizard.vue'),
    meta: { title: '部署向导' },
  },
  {
    path: '/config',
    name: 'ConfigDownload',
    component: () => import('@/views/ConfigDownload.vue'),
    meta: { title: '配置下载' },
  },
  {
    path: '/management',
    name: 'ServerManagement',
    component: () => import('@/views/ServerManagement.vue'),
    meta: { title: '部署管理' },
  },
  {
    path: '/history',
    name: 'DeployList',
    component: () => import('@/views/DeployList.vue'),
    meta: { title: '部署历史' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation error handling
router.onError((error) => {
  console.error('Router error:', error);
});

export default router;
