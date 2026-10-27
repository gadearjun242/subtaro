import { api } from '@/lib/axios'

export const planApi = {
  list: () => api.get('/plans').then((r) => r.data),
}

export const subscriptionApi = {
  getMine: () => api.get('/users/me/subscription').then((r) => r.data),
}

export const paymentApi = {
  config: () => api.get('/payments/config').then((r) => r.data),
  createOrder: (planKey) => api.post('/payments/order', { planKey }).then((r) => r.data),
  verify: (payload) => api.post('/payments/verify', payload).then((r) => r.data),
}
