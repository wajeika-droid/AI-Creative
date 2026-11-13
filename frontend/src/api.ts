import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cpai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('cpai_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error: any): string {
  return error?.response?.data?.error || error?.message || 'Permintaan gagal';
}
