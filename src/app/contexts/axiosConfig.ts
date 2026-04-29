import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

axios.defaults.baseURL = API_BASE;

// Injecte automatiquement le token JWT dans toutes les requêtes axios
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('fasi_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axios;