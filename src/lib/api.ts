import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Pages a visitor without an account can legitimately be on. A 401 here is
 * expected (e.g. QR ordering calls staff-only endpoints for the member
 * features) and must never bounce the customer to the staff login screen.
 */
const ANONYMOUS_PATHS = ['/order', '/order-success', '/pricing', '/register', '/auth'];

function isAnonymousPage(pathname: string) {
  return pathname === '/' || ANONYMOUS_PATHS.some(p => pathname.startsWith(p));
}

// Send a signed-in user back to login when their session actually expires —
// but only then. Never redirect someone who was never signed in.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem('token');

      if (hadToken) {
        // The token is proven bad — drop it so we stop retrying with it.
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (!isAnonymousPage(window.location.pathname)) {
          window.location.href = '/auth';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
