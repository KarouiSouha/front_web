import axios from 'axios';

// Normalise la variable d'environnement VITE_API_URL (avec ou sans /api)
const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const BACKEND_HOST = RAW_API_URL
  ? RAW_API_URL.replace(/\/api\/?$/i, '')
  : (import.meta.env.DEV ? 'http://localhost:8000' : 'https://fasi-backend.onrender.com');

// axios baseURL set to host (so calls like axios.get('/api/...') are proxied to BACKEND_HOST + '/api/...')
axios.defaults.baseURL = BACKEND_HOST;

// Injecte automatiquement le token JWT dans toutes les requêtes axios
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('fasi_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axios;