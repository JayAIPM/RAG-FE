import request from '@/api/index'

export const chatApi = {
  async ask(data) {
    const result = await request.post('/chat/ask', data)
    return result
  },

  async askStream(data, onChunk, onEnd, onError) {
    const token = localStorage.getItem('rag_token')
    const response = await fetch('/api/v1/chat/ask/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      onError?.(error.msg || '请求失败')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        
        try {
          const match = line.match(/^data:\s*(.+)$/)
          if (match) {
            const jsonStr = match[1]
            const data = JSON.parse(jsonStr)
            
            if (data.type === 'end') {
              onEnd?.(data.chatId)
            } else if (data.content) {
              onChunk?.(data.content)
            }
          }
        } catch (e) {
          console.error('Parse error:', e)
        }
      }
    }
  },

  async getHistory() {
    const data = await request.get('/chat/history')
    return data
  },

  async getChat(id) {
    const data = await request.get(`/chat/${id}`)
    return data
  },

  async deleteChat(id) {
    const result = await request.delete(`/chat/${id}`)
    return result
  }
}
