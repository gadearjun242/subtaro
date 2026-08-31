import { api } from '@/lib/axios'

export const uploadApi = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)

    return api
      .post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded / evt.total) * 100))
          }
        },
      })
      .then((r) => r.data)
  },
}
