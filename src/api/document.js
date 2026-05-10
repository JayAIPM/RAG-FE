import request from '@/api/index'

export const documentApi = {
  async getList(params) {
    const data = await request.get('/document', { params })
    return data
  },

  async getById(id) {
    const data = await request.get(`/document/${id}`)
    return data
  },

  async delete(id) {
    const result = await request.delete(`/document/${id}`)
    return result
  }
}
