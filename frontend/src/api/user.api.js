import { api } from '@/lib/axios'

export const userApi = {
  getMe: () => api.get('/users/me').then((r) => r.data),
  updateProfile: (payload) => api.patch('/users/me', payload).then((r) => r.data),
  changePassword: (payload) => api.patch('/users/me/password', payload).then((r) => r.data),

  getMyProjects: (params) =>
    api.get('/users/me/projects', { params }).then((r) => r.data),
  getMyProject: (projectId) =>
    api.get(`/users/me/projects/${projectId}`).then((r) => r.data),

  getMyStats: () => api.get('/users/me/stats').then((r) => r.data),
  getMyStorage: () => api.get('/users/me/storage').then((r) => r.data),

  deactivateAccount: (payload) =>
    api.patch('/users/me/deactivate', payload).then((r) => r.data),
  deleteAccount: (payload) => api.delete('/users/me', { data: payload }).then((r) => r.data),
}
