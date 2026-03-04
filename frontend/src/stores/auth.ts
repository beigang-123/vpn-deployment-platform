import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/services/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('access_token'));
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'));
  const user = ref<any>(null);
  const isLoading = ref(false);

  // Computed
  const isAuthenticated = computed(() => !!token.value);
  const currentUser = computed(() => user.value);

  // Actions
  const setAuth = (auth: AuthResponse) => {
    token.value = auth.accessToken;
    refreshToken.value = auth.refreshToken;
    user.value = auth.user;

    localStorage.setItem('access_token', auth.accessToken);
    localStorage.setItem('refresh_token', auth.refreshToken);
    localStorage.setItem('user', JSON.stringify(auth.user));
  };

  const clearAuth = () => {
    token.value = null;
    refreshToken.value = null;
    user.value = null;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    isLoading.value = true;
    try {
      const response = await authApi.login(credentials);
      setAuth(response);
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    isLoading.value = true;
    try {
      const response = await authApi.register(data);
      setAuth(response);
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };

  const refreshAccessToken = async (): Promise<void> => {
    if (!refreshToken.value) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await authApi.refreshToken(refreshToken.value);
      token.value = response.accessToken;
      localStorage.setItem('access_token', response.accessToken);
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  const loadUserFromStorage = (): void => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }
  };

  return {
    // State
    token,
    refreshToken,
    user,
    isLoading,

    // Computed
    isAuthenticated,
    currentUser,

    // Actions
    login,
    register,
    logout,
    refreshAccessToken,
    loadUserFromStorage,
    setAuth,
    clearAuth,
  };
});
