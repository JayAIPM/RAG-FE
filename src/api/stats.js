import request from '@/api/index'

const useMock = true

const mockDocuments = {
  total: 128,
  byType: {
    pdf: 45,
    docx: 32,
    txt: 51
  }
}

const mockChat = {
  total: 256,
  today: 12
}

export const statsApi = {
  async getDocuments() {
    if (useMock) {
      return mockDocuments
    }
    const data = await request.get('/stats/documents')
    return data
  },

  async getChat() {
    if (useMock) {
      return mockChat
    }
    const data = await request.get('/stats/chat')
    return data
  }
}
