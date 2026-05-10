<template>
  <div class="dashboard-content">
    <div class="page-header">
      <h1 class="page-title">工作台</h1>
      <p class="page-subtitle">欢迎回来，查看您的知识库概览</p>
    </div>

    <el-row :gutter="20" v-loading="loading" class="dashboard-row">
      <el-col :xs="24" :span="12">
        <el-card class="stat-card" body-style="{ padding: '20px' }">
          <div class="stat-content">
            <div class="stat-icon icon-blue">
              <el-icon class="icon-document"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ documentStats.total || 0 }}</div>
              <div class="stat-label">文档总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :span="12">
        <el-card class="stat-card" body-style="{ padding: '20px' }">
          <div class="stat-content">
            <div class="stat-icon icon-green">
              <el-icon class="icon-document"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ chatStats.total || 0 }}</div>
              <div class="stat-label">会话总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      class="mt-4"
      :closable="false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Document, ChatDotRound } from '@element-plus/icons-vue'
import { statsApi } from '@/api/stats'

const loading = ref(false)
const error = ref('')
const documentStats = ref({})
const chatStats = ref({})

async function fetchDocumentStats() {
  try {
    const data = await statsApi.getDocuments()
    documentStats.value = data
  } catch (e) {
    error.value = '获取文档统计失败'
  }
}

async function fetchChatStats() {
  try {
    const data = await statsApi.getChat()
    chatStats.value = data
  } catch (e) {
    error.value = '获取会话统计失败'
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchDocumentStats(), fetchChatStats()])
  } catch (e) {
    error.value = '获取统计数据失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard-content {
  padding: 24px;
  min-height: calc(100vh - 60px);
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

.dashboard-row {
  overflow-x: hidden;
}

.stat-card {
  min-height: 150px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-blue {
  background-color: #ecf5ff;
}

.icon-green {
  background-color: #f0f9eb;
}

.icon-document {
  font-size: 28px;
  color: #409eff;
}

.icon-green .icon-document {
  color: #67c23a;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}
</style>
