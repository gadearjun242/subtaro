import { api } from '@/lib/axios'

export const contactApi = {
  submit: (payload) => api.post('/contact', payload).then((r) => r.data),
}
