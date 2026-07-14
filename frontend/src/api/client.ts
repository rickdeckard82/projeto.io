import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let pendingQueue: (() => void)[] = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retry || config.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    config._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(apiClient(config)));
      });
    }

    isRefreshing = true;
    try {
      await apiClient.post('/auth/refresh');
      pendingQueue.forEach((fn) => fn());
      pendingQueue = [];
      return apiClient(config);
    } catch (refreshError) {
      pendingQueue = [];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
