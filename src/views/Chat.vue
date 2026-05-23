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
          <div 
            class="messages-container" 
            ref="messagesContainer"
            @click="handleReferenceClick"
          >
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
                <div v-if="msg.isStreaming && !msg.content" class="loading-indicator">
                  <div class="loading-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span class="loading-text">{{ loadingStatus === 'retrieving' ? '正在检索相关文档...' : '正在生成回答...' }}</span>
                </div>
                <div 
                  class="message-content"
                  v-html="renderMessageContent(msg, index)"
                ></div>
                <span v-if="msg.isStreaming && msg.content" class="typing-dot"></span>
                <div 
                  v-if="msg.references && msg.references.length > 0" class="references">
                  <div class="retrieval-stats">
                    根据 {{ msg.references.length }} 个相关片段生成回答
                  </div>
                  <div 
                    class="references-toggle"
                    @click="toggleReferences(index)"
                  >
                    <span class="references-title">
                      {{ referencesExpanded[index] ? '收起' : '展开' }} 引用来源
                    </span>
                    <el-icon :class="{ 'rotate-180': referencesExpanded[index] }">
                      <ArrowDown />
                    </el-icon>
                  </div>
                  <div 
                    v-show="referencesExpanded[index]" class="references-list">
                    <div
                      v-for="(ref, idx) in msg.references"
                      :key="idx"
                      class="reference-item"
                      :class="{ 'highlighted': highlightedReferenceIndex[index] === idx }"
                      :data-message-index="index"
                      :data-ref-index="idx"
                    >
                      <span class="ref-index">[{{ idx + 1 }}]</span>
                      {{ ref.content }}
                    </div>
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
import { Plus, ChatDotRound, Promotion, VideoPause, Delete, ArrowDown } from '@element-plus/icons-vue'
import { requestStream } from '@/utils/request'
import { chatApi } from '@/api/chat'

const chatHistory = ref([])
const currentChatId = ref(null)
const messages = ref([])
const inputMessage = ref('')
const isStreaming = ref(false)
const isRetrieving = ref(false) // 是否正在检索
const loadingStatus = ref(null) // 加载状态：null / 'retrieving' / 'generating'
const messagesContainer = ref(null)
const abortController = ref(null)
const referencesExpanded = ref({}) // 记录每个消息的引用是否展开
const highlightedReferenceIndex = ref({}) // 记录每个消息当前高亮的引用索引

function normalizeChat(chat) {
  return {
    ...chat,
    _id: chat._id || chat.id
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

// 渲染消息内容，将引用序号转换为可点击的链接
function renderMessageContent(msg, messageIndex) {
  if (!msg.content) return ''
  
  let content = msg.content
  // 将 [1]、[2] 等引用序号替换为可点击的 span
  content = content.replace(/\[(\d+)\]/g, (match, num) => {
    const refIndex = parseInt(num) - 1
    return `<span class="reference-link" data-index="${refIndex}" data-message-index="${messageIndex}">${match}</span>`
  })
  
  return content
}

// 切换引用列表展开/折叠
function toggleReferences(messageIndex) {
  referencesExpanded.value[messageIndex] = !referencesExpanded.value[messageIndex]
}

// 处理引用序号点击
function handleReferenceClick(event) {
  const target = event.target
  if (target.classList.contains('reference-link')) {
    const refIndex = parseInt(target.dataset.index)
    const messageIndex = parseInt(target.dataset.messageIndex)
    
    // 高亮对应的引用项
    highlightedReferenceIndex.value[messageIndex] = refIndex
    
    // 如果引用列表是折叠的，先展开
    if (!referencesExpanded.value[messageIndex]) {
      referencesExpanded.value[messageIndex] = true
    }
    
    // 滚动到引用项（延迟到下一个 tick 确保 DOM 已更新）
    nextTick(() => {
      const referenceItem = document.querySelector(
        `.reference-item[data-message-index="${messageIndex}"][data-ref-index="${refIndex}"]`
      )
      if (referenceItem) {
        referenceItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
    
    // 3秒后清除高亮
    setTimeout(() => {
      if (highlightedReferenceIndex.value[messageIndex] === refIndex) {
        highlightedReferenceIndex.value[messageIndex] = null
      }
    }, 3000)
  }
}

// 流式结束后获取完整对话详情
async function fetchChatDetailsAfterStream(chatId) {
  if (!chatId) return
  
  try {
    // 延时 1 秒再获取
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const data = await chatApi.getById(chatId)
    
    // 更新当前对话的消息，补充引用信息
    if (data && data.messages) {
      // 找到当前对话的助手消息（应该是最后一条）
      const lastAssistantMsgIndex = messages.value.findLastIndex(
        m => m.role === 'assistant'
      )
      
      if (lastAssistantMsgIndex !== -1) {
        const backendMsg = data.messages.findLast(
          m => m.role === 'assistant'
        )
        
        if (backendMsg) {
          messages.value[lastAssistantMsgIndex] = {
            ...messages.value[lastAssistantMsgIndex],
            content: backendMsg.content,
            references: backendMsg.references || []
          }
        }
      }
    }
  } catch (error) {
    // 静默失败，不做处理
    console.error('获取对话详情失败:', error)
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
    // 初始化引用状态
    referencesExpanded.value = {}
    highlightedReferenceIndex.value = {}
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
    loadingStatus.value = 'retrieving' // 开始检索阶段
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
      // 根据 currentChatId 动态构建请求体，支持多轮对话
      const requestBody = {
        query: query,
        // 仅在有 chatId 时添加，实现多轮对话上下文
        ...(currentChatId.value && { chatId: currentChatId.value })
      }
      
      const response = await requestStream('/api/v1/chat/ask/stream', {
        method: 'POST',
        body: JSON.stringify(requestBody),
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
                // 开始接收内容时切换到生成阶段
                if (loadingStatus.value === 'retrieving' && !assistantMsg.content) {
                  loadingStatus.value = 'generating'
                }
                assistantMsg.content += content
                scrollToBottom()
              } else if (type === 'end') {
                assistantMsg.isStreaming = false
                loadingStatus.value = null // 清除加载状态
                if (chatId) {
                  currentChatId.value = chatId
                  // 流式结束后，延时1秒获取完整对话详情（包含引用信息）
                  fetchChatDetailsAfterStream(chatId)
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
      loadingStatus.value = null // 清除加载状态
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
      loadingStatus.value = null // 清除加载状态
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

.reference-link {
  color: #4f46e5;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.reference-link:hover {
  background-color: #eef2ff;
  border-radius: 2px;
  padding: 0 2px;
}

.references {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.retrieval-stats {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  padding: 6px 10px;
  background-color: #f3f4f6;
  border-radius: 4px;
  display: inline-block;
}

.references-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.2s;
}

.references-toggle:hover {
  color: #4f46e5;
}

.references-toggle .el-icon {
  transition: transform 0.3s;
  font-size: 14px;
  color: #9ca3af;
}

.references-toggle:hover .el-icon {
  color: #4f46e5;
}

.references-toggle .el-icon.rotate-180 {
  transform: rotate(180deg);
}

.references-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 0;
}

.references-list {
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.reference-item {
  font-size: 12px;
  background-color: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  color: #4b5563;
  transition: all 0.3s;
}

.reference-item.highlighted {
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.ref-index {
  color: #4f46e5;
  font-weight: 600;
}

.streaming {
  display: inline-flex;
  align-items: center;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background-color: #9ca3af;
  border-radius: 50%;
  animation: loading-dot 1.4s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading-dot {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
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
