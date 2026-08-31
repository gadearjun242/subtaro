import { api } from '@/lib/axios'

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  logoutAll: () => api.post('/auth/logout-all').then((r) => r.data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`).then((r) => r.data),
  resendVerification: () => api.post('/auth/resend-verification').then((r) => r.data),
}
