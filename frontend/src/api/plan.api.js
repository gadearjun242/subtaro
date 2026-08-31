import { api } from '@/lib/axios'

export const planApi = {
  list: () => api.get('/plans').then((r) => r.data),
}

export const subscriptionApi = {
  getMine: () => api.get('/users/me/subscription').then((r) => r.data),
  activate: (planKey) =>
    api.post('/users/me/subscription/activate', { planKey }).then((r) => r.data),
}
