import { api } from '@/lib/axios'

export const projectApi = {
  // NOTE: this endpoint takes the Mongo _id, not the human projectId string.
  // We mostly navigate/fetch through the /users/me/projects/:projectId
  // routes below instead, since those use the friendly projectId.
  create: (payload) => api.post('/projects', payload).then((r) => r.data),
  getById: (mongoId) => api.get(`/projects/${mongoId}`).then((r) => r.data),
  refresh: (mongoId) => api.get(`/projects/${mongoId}/refresh`).then((r) => r.data),
  getLogs: (mongoId, limit = 200) =>
    api.get(`/projects/${mongoId}/logs`, { params: { limit } }).then((r) => r.data),
  resume: (mongoId) => api.post(`/projects/${mongoId}/resume`).then((r) => r.data),

  // Uploads the edited SRT content as a NEW Cloudinary file, then
  // deletes the previous one server-side, and updates the project.
  // `subtitleMode` and `subtitleStyle` are optional — pass either to
  // switch delivery mode ("embedded"/"selectable") or, for embedded
  // mode, the burned-in caption style preset.
  updateSubtitle: (mongoId, content, subtitleMode, subtitleStyle) =>
    api
      .patch(`/projects/${mongoId}/subtitle`, {
        content,
        ...(subtitleMode ? { subtitleMode } : {}),
        ...(subtitleStyle ? { subtitleStyle } : {}),
      })
      .then((r) => r.data),

  rename: (mongoId, name) => api.patch(`/projects/${mongoId}`, { name }).then((r) => r.data),

  duplicate: (mongoId, payload) =>
    api.post(`/projects/${mongoId}/duplicate`, payload || {}).then((r) => r.data),

  remove: (mongoId) => api.delete(`/projects/${mongoId}`).then((r) => r.data),
}
