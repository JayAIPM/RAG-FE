<template>
  <div class="chat-content">
    <div class="page-header">
      <h1 class="page-title">智能问答</h1>
      <p class="page-subtitle">基于知识库的智能问答助手</p>
    </div>

    <el-card class="chat-card" :body-style="{ padding: '0px' }">
      <div class="chat-layout">
        <div class="sidebar">
          <div class="sidebar-section">
            <div class="section-title">对话历史</div>
            <div class="history-list">
              <div
                v-for="chat in chatHistory"
                :key="chat._id"
                class="history-item"
                :class="{ active: currentChatId === chat._id }"
                @click="loadChat(chat._id)"
              >
                <div class="history-content">
                  <div class="history-title">{{ chat.title }}</div>
                  <div class="history-time">{{ formatTime(chat.updatedAt) }}</div>
                </div>
                <el-icon class="delete-icon" @click.stop="handleDeleteChat(chat._id)">
                  <Delete />
                </el-icon>
              </div>
              <div v-if="chatHistory.length === 0" class="empty-text">
                暂无对话记录
              </div>
            </div>
          </div>
          <div class="sidebar-footer">
            <el-button class="new-chat-btn" @click="newChat">
              <el-icon class="mr-2"><Plus /></el-icon>
              新建对话
            </el-button>
          </div>
        </div>

        <div class="main-area">
          <div class="messages-container" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-state">
              <el-icon class="empty-icon"><ChatDotRound /></el-icon>
              <p>输入您的问题，开始智能问答</p>
            </div>
            <div
              v-for="(msg, index) in messages"
              :key="index"
              class="message-wrapper"
              :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
            >
              <div class="message-bubble" :class="{ streaming: msg.isStreaming }">
                <div class="message-content" v-html="formatContentWithReferences(msg)"></div>
                <span v-if="msg.isStreaming" class="typing-dot"></span>
                <div v-if="msg.references && msg.references.length > 0" class="references">
                  <div class="references-title">引用来源：</div>
                  <div
                    v-for="(ref, idx) in msg.references"
                    :key="idx"
                    class="reference-item"
                    :class="{ active: activeRefIndex === idx }"
                    @mouseenter="activeRefIndex = idx"
                    @mouseleave="activeRefIndex = null"
                  >
                    <span class="ref-index">[{{ idx + 1 }}]</span>
                    <span class="ref-content">{{ ref.content }}</span>
                    <span v-if="ref.documentName" class="ref-source"> - {{ ref.documentName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="input-area">
            <div class="input-tip">AI 回答仅供参考，请以实际情况为准</div>
            <div class="input-wrapper">
              <el-input
                v-model="inputMessage"
                placeholder="输入您的问题，按 Enter 发送，Shift+Enter 换行..."
                @keydown="handleKeyDown"
                :disabled="isStreaming"
                resize="none"
                :rows="2"
                type="textarea"
              />
              <el-button
                v-if="isStreaming"
                type="warning"
                @click="stopGeneration"
              >
                <el-icon><VideoPause /></el-icon>
              </el-button>
              <el-button
                v-else
                type="primary"
                :disabled="!inputMessage.trim()"
                @click="handleSend"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ChatDotRound, Promotion, VideoPause, Delete } from '@element-plus/icons-vue'
import { requestStream } from '@/utils/request'
import { chatApi } from '@/api/chat'

const chatHistory = ref([])
const currentChatId = ref(null)
const messages = ref([])
const inputMessage = ref('')
const isStreaming = ref(false)
const messagesContainer = ref(null)
const abortController = ref(null)
const activeRefIndex = ref(null)

function normalizeChat(chat) {
  return {
    ...chat,
    _id: chat._id || chat.id
  }
}

function formatContentWithReferences(msg) {
  if (!msg.content || !msg.references || msg.references.length === 0) {
    console.log('没有引用数据:', msg.content, msg.references)
    return escapeHtml(msg.content || '')
  }

  console.log('有引用数据:', msg.references.length, '个引用')
  let content = escapeHtml(msg.content)
  console.log('原始内容:', content)
  
  msg.references.forEach((ref, idx) => {
    const refPattern = new RegExp(`\\[${idx + 1}\\]`, 'g')
    content = content.replace(refPattern, `<span class="ref-mark" data-index="${idx}">[${idx + 1}]</span>`)
  })

  console.log('处理后内容:', content)
  return content
}

function escapeHtml(text) {
  if (!text) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

function handleRefMarkClick(e) {
  const target = e.target
  if (target.classList.contains('ref-mark')) {
    const index = parseInt(target.dataset.index)
    if (!isNaN(index)) {
      activeRefIndex.value = activeRefIndex.value === index ? null : index
      alert(`点击了引用标记 [${index + 1}]`)
    }
  }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
  }
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isStreaming.value = false
    ElMessage.info('已停止生成')
  }
}

function newChat() {
  currentChatId.value = null
  messages.value = []
  inputMessage.value = ''
}

async function handleDeleteChat(id) {
  try {
    await ElMessageBox.confirm('确定要删除该对话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await chatApi.delete(id)
    ElMessage.success('删除成功')
    if (currentChatId.value === id) {
      newChat()
    }
    await fetchChatHistory()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除对话失败:', e)
    }
  }
}

async function loadChat(id) {
  currentChatId.value = id
  await fetchChatDetail(id)
  scrollToBottom()
}

async function fetchChatDetail(id) {
  try {
    const data = await chatApi.getById(id)
    messages.value = data.messages || []
  } catch (e) {
    ElMessage.error('获取对话详情失败')
  }
}

async function handleSend() {
    if (!inputMessage.value.trim() || isStreaming.value) return

    const query = inputMessage.value.trim()
    inputMessage.value = ''

    messages.value.push({
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
      references: []
    })

    scrollToBottom()

    isStreaming.value = true
    abortController.value = new AbortController()

    const assistantMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      references: [],
      isStreaming: true
    }
    messages.value.push(assistantMsg)

    scrollToBottom()

    try {
      const response = await requestStream('/api/v1/chat/ask/stream', {
        method: 'POST',
        body: JSON.stringify({ query }),
        signal: abortController.value.signal
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6))
              const { type, content, chatId } = jsonData.data || {}

              if (type === 'content') {
                assistantMsg.content += content
                scrollToBottom()
              } else if (type === 'end') {
                assistantMsg.isStreaming = false
                if (chatId) {
                  currentChatId.value = chatId
                }
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e)
            }
          }
        }
      }

      assistantMsg.isStreaming = false
      isStreaming.value = false
      abortController.value = null
      await fetchChatHistory()
    } catch (e) {
      if (e.name === 'AbortError') {
        ElMessage.info('已停止生成')
      } else {
        ElMessage.error('发送失败，请重试')
      }
      assistantMsg.isStreaming = false
      isStreaming.value = false
      abortController.value = null
    }
  }

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function fetchChatHistory() {
  try {
    const data = await chatApi.getHistory()
    chatHistory.value = (data.list || []).map(normalizeChat)
  } catch (e) {
    console.error('获取对话历史失败:', e)
  }
}

onMounted(async () => {
  await fetchChatHistory()
  
  setTimeout(() => {
    const container = messagesContainer.value
    if (container) {
      container.addEventListener('click', handleRefMarkClick)
      console.log('事件监听器已绑定')
    } else {
      console.error('messagesContainer is null')
    }
  }, 100)
})
</script>

<style scoped>
.chat-content {
  padding: 24px;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.chat-card {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
}

.chat-layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 260px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
}

.sidebar-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-title {
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
}

.history-item:hover {
  background-color: #f3f4f6;
}

.history-item.active {
  background-color: #e0e7ff;
}

.history-content {
  flex: 1;
  overflow: hidden;
}

.delete-icon {
  opacity: 0;
  color: #9ca3af;
  cursor: pointer;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: 8px;
}

.history-item:hover .delete-icon {
  opacity: 1;
}

.delete-icon:hover {
  color: #ef4444;
}

.history-title {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 12px;
  color: #9ca3af;
}

.empty-text {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 14px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.new-chat-btn {
  width: 100%;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.message-wrapper {
  margin-bottom: 16px;
  display: flex;
}

.user-message {
  justify-content: flex-end;
}

.assistant-message {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  word-break: break-word;
}

.user-message .message-bubble {
  background-color: #4f46e5;
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant-message .message-bubble {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.message-content .ref-mark {
  color: #4f46e5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  margin: 0 2px;
}

.message-content .ref-mark:hover {
  color: #3730a3;
  background-color: #eef2ff;
  border-radius: 2px;
  padding: 0 2px;
}

.references {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.references-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.reference-item {
  font-size: 12px;
  background-color: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  color: #4b5563;
  transition: all 0.2s ease;
  cursor: pointer;
}

.reference-item:hover,
.reference-item.active {
  background-color: #eef2ff;
  border-left: 3px solid #4f46e5;
}

.ref-index {
  color: #4f46e5;
  font-weight: 600;
  margin-right: 6px;
}

.ref-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-source {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 8px;
}

.streaming {
  display: inline-flex;
  align-items: center;
}

.typing-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background-color: #9ca3af;
  border-radius: 50%;
  margin-left: 4px;
  animation: typing 1.4s infinite;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}

.input-area {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background-color: #fafafa;
}

.input-tip {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 12px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper .el-textarea {
  flex: 1;
}
</style>
