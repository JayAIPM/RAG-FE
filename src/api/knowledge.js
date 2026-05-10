import request from '@/api/index'

const useMock = false

const mockList = [
  {
    id: '1',
    name: '产品知识库',
    description: '公司产品相关文档和资料',
    documentCount: 45,
    createdAt: '2026-04-15 10:30:00',
    updatedAt: '2026-05-08 14:20:00'
  },
  {
    id: '2',
    name: '技术文档库',
    description: '技术架构和开发文档',
    documentCount: 32,
    createdAt: '2026-04-20 09:15:00',
    updatedAt: '2026-05-07 16:45:00'
  },
  {
    id: '3',
    name: '运营规范',
    description: '运营流程和规范文档',
    documentCount: 18,
    createdAt: '2026-04-25 11:00:00',
    updatedAt: '2026-05-06 10:30:00'
  }
]

export const knowledgeApi = {
  async getList(params) {
    if (useMock) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockList
    }
    const data = await request.get('/knowledge', { params })
    return data
  },

  async create(data) {
    const result = await request.post('/knowledge', data)
    return result
  },

  async update(id, data) {
    const result = await request.put(`/knowledge/${id}`, data)
    return result
  },

  async delete(id) {
    const result = await request.delete(`/knowledge/${id}`)
    return result
  },

  async getById(id) {
    const data = await request.get(`/knowledge/${id}`)
    return data
  },

  async getDocumentList(knowledgeId, params) {
    const data = await request.get('/document', { ...params, knowledgeBaseId: knowledgeId })
    return data
  }
}
