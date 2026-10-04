import axios from 'axios';

const getApiBaseURL = () => {
  const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
  const pageHost = window.location.hostname;
  const isLoopback = (hostname) => ['localhost', '127.0.0.1', '::1'].includes(hostname);

  if (!configuredBaseURL) {
    return `${window.location.protocol}//${pageHost}:5000/api`;
  }

  const parsedBaseURL = new URL(configuredBaseURL, window.location.origin);
  if (!isLoopback(pageHost) && isLoopback(parsedBaseURL.hostname)) {
    parsedBaseURL.hostname = pageHost;
    parsedBaseURL.protocol = window.location.protocol;
  }

  return parsedBaseURL.toString().replace(/\/$/, '');
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem('companyai-session'));
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  } catch {
    localStorage.removeItem('companyai-session');
  }

  return config;
});

export default api;
