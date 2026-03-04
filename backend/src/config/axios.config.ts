import axios from 'axios';

// 创建一个带重试功能的 axios 实例
export const createAxiosInstance = () => {
  const instance = axios.create({
    timeout: 10000, // 10 秒超时
  } as any); // 使用类型断言以支持 Node.js 特定选项

  // 为 Node.js 环境配置 HTTP/HTTPS 代理
  (instance.defaults as any).httpAgent = new (require('http').Agent)({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
  });
  (instance.defaults as any).httpsAgent = new (require('https').Agent)({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    rejectUnauthorized: false, // 仅用于内部服务
  });

  // 添加请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // 可以在这里添加日志
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 添加响应拦截器，处理常见的网络错误
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // 如果是 ECONNRESET 或网络错误，尝试重试
      if (
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('socket hang up')
      ) {
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          if (originalRequest._retryCount <= 2) {
            console.log(`请求失败，正在重试 (${originalRequest._retryCount}/2): ${originalRequest.url}`);
            // 等待 1 秒后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            return instance(originalRequest);
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// 导出默认实例
export const axiosInstance = createAxiosInstance();
