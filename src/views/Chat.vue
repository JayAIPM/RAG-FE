<template>
  <div class="flex h-full">
    <div class="w-72 border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <h3 class="font-semibold mb-3">知识库</h3>
        <div class="space-y-2">
          <div
            v-for="kb in knowledgeList"
            :key="kb._id"
            class="flex items-center gap-2 p-2 rounded cursor-pointer"
            :class="{ 'bg-primary/10': selectedKnowledgeIds.includes(kb._id) }"
            @click="toggleKnowledge(kb._id)"
          >
            <el-checkbox
              :checked="selectedKnowledgeIds.includes(kb._id)"
              @change="toggleKnowledge(kb._id)"
            />
            <span class="text-sm truncate">{{ kb.name }}</span>
          </div>
        </div>
      </div>
      
      <div class="p-4 border-b border-gray-200">
        <h3 class="font-semibold mb-3">对话历史</h3>
        <div class="space-y-2 max-h-80 overflow-auto">
          <div
            v-for="chat in chatHistory"
            :key="chat._id"
            class="p-2 rounded cursor-pointer hover:bg-gray-100"
            :class="{ 'bg-gray-100': currentChatId === chat._id }"
            @click="loadChat(chat._id)"
          >
            <div class="text-sm truncate">{{ chat.title }}</div>
            <div class="text-xs text-gray-400">{{ formatTime(chat.updatedAt) }}</div>
          </div>
          <div v-if="chatHistory.length === 0" class="text-center text-gray-400 py-4">
            暂无对话
          </div>
        </div>
      </div>
      
      <div class="p-4 mt-auto">
        <el-button class="w-full" @click="newChat">
          <component :is="icons.Plus" class="w-5 h-5 mr-2" />
          新建对话
        </el-button>
      </div>
    </div>
    
    <div class="flex-1 flex flex-col">
      <div class="h-12 px-4 flex items-center justify-between border-b border-gray-200">
        <span class="font-semibold">
          {{ currentChat?.title || '智能问答' }}
          <span v-if="selectedKnowledgeIds.length > 0" class="text-sm text-gray-500 ml-2">
            ({{ selectedKnowledgeIds.length }}个知识库)
          </span>
        </span>
        <el-button text v-if="currentChat" @click="deleteCurrentChat">
          <component :is="icons.Delete" class="w-5 h-5" />
        </el-button>
      </div>
      
      <div ref="messagesContainer" class="flex-1 overflow-auto p-4 space-y-4">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            :class="[
              'max-w-3/4 p-3 rounded-lg',
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'
            ]"
          >
            <div class="whitespace-pre-wrap">{{ msg.content }}</div>
            <div v-if="msg.references && msg.references.length > 0" class="mt-2 pt-2 border-t border-gray-200">
              <div class="text-xs text-gray-500 mb-2">引用来源：</div>
              <div
                v-for="(ref, idx) in msg.references"
                :key="idx"
                class="text-xs bg-gray-100 p-2 rounded mb-1"
              >
                <span class="text-primary">[{{ idx + 1 }}]</span>
                {{ ref.documentName }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="isStreaming" class="flex justify-start">
          <div class="max-w-3/4 p-3 rounded-lg bg-white border">
            <span class="typing-indicator">{{ currentMessageContent }}</span>
            <span class="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1"></span>
            <span class="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style="animation-delay: 0.2s"></span>
            <span class="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style="animation-delay: 0.4s"></span>
          </div>
        </div>
      </div>
      
      <div class="p-4 border-t border-gray-200">
        <div class="text-xs text-gray-400 mb-2 text-center">
          AI 回答仅供参考，请以实际情况为准
        </div>
        <div class="flex gap-3">
          <el-input
            v-model="inputMessage"
            placeholder="输入您的问题..."
            @keyup.enter="sendMessage"
            :disabled="isStreaming"
            class="flex-1"
          />
          <el-button type="primary" @click="sendMessage" :disabled="isStreaming || !inputMessage.trim()">
            <component :is="icons.ArrowRight" class="w-5 h-5" />
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>import { ref, onMounted, nextTick } from 'vue';
import * as icons from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useChatStore } from '@/stores/chat';
import { useKnowledgeStore } from '@/stores/knowledge';
const chatStore = useChatStore();
const knowledgeStore = useKnowledgeStore();
const knowledgeList = ref([]);
const chatHistory = ref([]);
const currentChatId = ref(null);
const messages = ref([]);
const inputMessage = ref('');
const isStreaming = ref(false);
const currentMessageContent = ref('');
const messagesContainer = ref(null);
const selectedKnowledgeIds = ref([]);
function formatTime(dateStr) {
 if (!dateStr)
 return '';
 const date = new Date(dateStr);
 const now = new Date();
 const diff = now.getTime() - date.getTime();
 const days = Math.floor(diff / (1000 * 60 * 60 * 24));
 if (days === 0) {
 const hours = Math.floor(diff / (1000 * 60 * 60));
 if (hours === 0) {
 const minutes = Math.floor(diff / (1000 * 60));
 return `${minutes}分钟前`;
 }
 return `${hours}小时前`;
 }
 else if (days < 7) {
 return `${days}天前`;
 }
 else {
 return date.toLocaleDateString();
 }
}
function toggleKnowledge(id) {
 const index = selectedKnowledgeIds.value.indexOf(id);
 if (index > -1) {
 selectedKnowledgeIds.value.splice(index, 1);
 }
 else {
 selectedKnowledgeIds.value.push(id);
 }
 chatStore.setSelectedKnowledgeIds(selectedKnowledgeIds.value);
}
function newChat() {
 currentChatId.value = null;
 messages.value = [];
 inputMessage.value = '';
}
async function loadChat(id) {
 currentChatId.value = id;
 await chatStore.fetchChatDetail(id);
 messages.value = chatStore.messages;
 scrollToBottom();
}
async function sendMessage() {
 if (!inputMessage.value.trim() || isStreaming.value)
 return;
 const query = inputMessage.value.trim();
 inputMessage.value = '';
 messages.value.push({
 role: 'user',
 content: query,
 timestamp: new Date().toISOString()
 });
 scrollToBottom();
 isStreaming.value = true;
 currentMessageContent.value = '';
 messages.value.push({
 role: 'assistant',
 content: '',
 references: [],
 timestamp: new Date().toISOString()
 });
 scrollToBottom();
 await chatStore.sendMessageStream(query, (chunk) => {
 currentMessageContent.value += chunk;
 const lastMsg = messages.value[messages.value.length - 1];
 if (lastMsg) {
 lastMsg.content = currentMessageContent.value;
 }
 scrollToBottom();
 }, (chatId) => {
 isStreaming.value = false;
 currentChatId.value = chatId;
 }, (error) => {
 isStreaming.value = false;
 ElMessage.error(error || '发送失败');
 });
}
async function deleteCurrentChat() {
 if (!currentChatId.value)
 return;
 try {
 await chatStore.deleteChat(currentChatId.value);
 newChat();
 await fetchChatHistory();
 ElMessage.success('删除成功');
 }
 catch (e) {
 ElMessage.error('删除失败');
 }
}
function scrollToBottom() {
 nextTick(() => {
 if (messagesContainer.value) {
 messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
 }
 });
}
async function fetchKnowledgeList() {
 try {
 await knowledgeStore.fetchKnowledgeList();
 knowledgeList.value = knowledgeStore.knowledgeList;
 }
 catch (e) {
 console.error('获取知识库列表失败:', e);
 }
}
async function fetchChatHistory() {
 try {
 await chatStore.fetchChatHistory();
 chatHistory.value = chatStore.chatHistory;
 }
 catch (e) {
 console.error('获取对话历史失败:', e);
 }
}
onMounted(async () => {
 await fetchKnowledgeList();
 await fetchChatHistory();
});
</script>

<style scoped>
.typing-indicator {
  display: inline;
}
</style>
