import axios from 'axios';

// In development, default to local proxy '/api'.
// In production, default to the live Render backend if VITE_API_URL is not set.
const defaultApiUrl = import.meta.env.DEV
  ? '/api'
  : 'https://hustlex-team-workspace-api.onrender.com/api';

const apiBase = import.meta.env.VITE_API_URL || defaultApiUrl;

export const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token and active team ID to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hustlex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeTeamId = localStorage.getItem('hustlex_active_team_id');
  if (activeTeamId) {
    config.headers['x-team-id'] = activeTeamId;
  }

  return config;
});

// Handle auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid credentials
      localStorage.removeItem('hustlex_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
