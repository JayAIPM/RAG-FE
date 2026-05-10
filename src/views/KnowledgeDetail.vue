<template>
  <div class="detail-content">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/knowledge')">
          <el-icon class="mr-2"><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <div class="knowledge-info">
          <h1 class="knowledge-name">{{ knowledge?.name || '加载中...' }}</h1>
          <p class="knowledge-desc">{{ knowledge?.description || '' }}</p>
        </div>
      </div>
    </div>

    <el-card class="list-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>文档列表</span>
          <el-button type="primary" @click="uploadVisible = true">
            上传文档
          </el-button>
        </div>
      </template>
      <el-table :data="documentList" stripe>
        <el-table-column prop="name" label="文件名" min-width="200" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="size" label="大小" width="120">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="180" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="scope">
            <el-button type="danger" link @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="uploadVisible"
      title="上传文档"
      width="500px"
      @close="uploadVisible = false"
    >
      <el-upload
        class="upload-demo"
        drag
        :action="uploadUrl"
        :headers="uploadHeaders"
        :data="{ knowledgeBaseId: knowledgeId }"
        :multiple="false"
        :accept="'.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md'"
        :before-upload="handleBeforeUpload"
        @success="handleUploadSuccess"
        @error="handleUploadError"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 pdf、doc、docx、xls、xlsx、ppt、pptx、txt、md 格式文件，单个文件不超过 50MB
          </div>
        </template>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, UploadFilled } from '@element-plus/icons-vue'
import { knowledgeApi } from '@/api/knowledge'
import { documentApi } from '@/api/document'
import storage from '@/utils/storage'

const route = useRoute()
const knowledgeId = computed(() => route.params.id)

const loading = ref(false)
const knowledge = ref(null)
const documentList = ref([])
const uploadVisible = ref(false)

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const uploadUrl = '/api/v1/document/upload'
const uploadHeaders = {
  Authorization: `Bearer ${storage.getToken()}`
}

function formatSize(size) {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getStatusType(status) {
  const types = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    pending: '等待处理',
    processing: '处理中',
    completed: '处理完成',
    failed: '处理失败'
  }
  return texts[status] || status
}

function handleUploadSuccess() {
  ElMessage.success('上传成功')
  uploadVisible.value = false
  pagination.value.page = 1
  fetchDocuments()
}

function handleUploadError() {
  ElMessage.error('上传失败')
}

function handleBeforeUpload(file) {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档「${row.name}」吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  try {
    await documentApi.delete(row._id)
    ElMessage.success('删除成功')
    const totalAfterDelete = pagination.value.total - 1
    const maxPage = Math.ceil(totalAfterDelete / pagination.value.pageSize) || 1
    if (pagination.value.page > maxPage) {
      pagination.value.page = maxPage
    }
    await fetchDocuments()
  } catch (e) {
  }
}

async function fetchKnowledgeDetail() {
  try {
    const data = await knowledgeApi.getById(knowledgeId.value)
    knowledge.value = data
  } catch (e) {
    ElMessage.error('获取知识库详情失败')
  }
}

async function fetchDocuments() {
  loading.value = true
  try {
    const data = await documentApi.getList({
      knowledgeBaseId: knowledgeId.value,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })
    documentList.value = data.list || []
    pagination.value.total = data.total || 0
  } catch (e) {
    ElMessage.error('获取文档列表失败')
  } finally {
    loading.value = false
  }
}

function handleSizeChange() {
  pagination.value.page = 1
  fetchDocuments()
}

function handleCurrentChange() {
  fetchDocuments()
}

onMounted(async () => {
  await fetchKnowledgeDetail()
  await fetchDocuments()
})
</script>

<style scoped>
.detail-content {
  padding: 24px;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.knowledge-info {
  flex: 1;
}

.knowledge-name {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.knowledge-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.list-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.upload-demo {
  width: 100%;
}

.el-upload__tip {
  margin-top: 8px;
  color: #909399;
}
</style>
