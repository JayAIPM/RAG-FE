import request from '@/api/index'

export const chatApi = {
  async getHistory(params) {
    const data = await request.get('/chat/history', { params })
    return data
  },

  async getById(id) {
    const data = await request.get(`/chat/${id}`)
    return data
  },

  async delete(id) {
    const result = await request.delete(`/chat/${id}`)
    return result
  }
}
