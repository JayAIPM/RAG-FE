import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatApi } from '@/api/chat'

export const useChatStore = defineStore('chat', () => {
  const chatHistory = ref([])
  const currentChat = ref(null)
  const messages = ref([])
  const isStreaming = ref(false)
  const selectedKnowledgeIds = ref([])
  const currentMessageContent = ref('')

  async function fetchChatHistory() {
    const data = await chatApi.getHistory()
    chatHistory.value = data || []
    return data
  }

  async function fetchChatDetail(id) {
    const data = await chatApi.getChat(id)
    currentChat.value = data
    messages.value = data?.messages || []
    return data
  }

  async function sendMessage(query) {
    const data = await chatApi.ask({
      query,
      knowledgeBaseIds: selectedKnowledgeIds.value
    })
    return data
  }

  async function sendMessageStream(query, onChunk, onEnd, onError) {
    isStreaming.value = true
    currentMessageContent.value = ''

    try {
      await chatApi.askStream({
        query,
        knowledgeBaseIds: selectedKnowledgeIds.value
      }, onChunk, onEnd, onError)
    } finally {
      isStreaming.value = false
    }
  }

  async function deleteChat(id) {
    const result = await chatApi.deleteChat(id)
    chatHistory.value = chatHistory.value.filter(c => c._id !== id)
    if (currentChat.value?._id === id) {
      currentChat.value = null
      messages.value = []
    }
    return result
  }

  function clearMessages() {
    messages.value = []
    currentChat.value = null
  }

  function addMessage(message) {
    messages.value.push(message)
  }

  function updateLastMessage(content, references = []) {
    if (messages.value.length > 0) {
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage.role === 'assistant') {
        lastMessage.content = content
        lastMessage.references = references
      }
    }
  }

  function setSelectedKnowledgeIds(ids) {
    selectedKnowledgeIds.value = ids
    clearMessages()
  }

  function setCurrentChat(chat) {
    currentChat.value = chat
    messages.value = chat?.messages || []
  }

  return {
    chatHistory,
    currentChat,
    messages,
    isStreaming,
    selectedKnowledgeIds,
    currentMessageContent,
    fetchChatHistory,
    fetchChatDetail,
    sendMessage,
    sendMessageStream,
    deleteChat,
    clearMessages,
    addMessage,
    updateLastMessage,
    setSelectedKnowledgeIds,
    setCurrentChat
  }
})
