import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh_token = localStorage.getItem('refresh_token');
      if (refresh_token) {
        try {
          const res = await axios.post('/api/auth/refresh', { refresh_token });
          localStorage.setItem('access_token', res.data.access_token);
          err.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return axios(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
