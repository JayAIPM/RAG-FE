<template>
  <div class="knowledge-content">
    <div class="page-header">
      <h1 class="page-title">知识库管理</h1>
      <p class="page-subtitle">管理您的知识库，创建、编辑和删除知识库</p>
    </div>

    <el-card class="list-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>知识库列表</span>
          <el-button type="primary" @click="openCreateDialog">
            创建知识库
          </el-button>
        </div>
      </template>
      <el-table :data="knowledgeList" stripe>
        <el-table-column label="名称" min-width="150">
          <template #default="scope">
            <el-link type="primary" @click="goToDetail(scope.row)">
              {{ scope.row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="documentCount" label="文档数" width="100" align="center" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="150" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="openEditDialog(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '创建知识库' : '编辑知识库'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入知识库名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="请输入知识库描述"
            :rows="4"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

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
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knowledgeApi } from '@/api/knowledge'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const knowledgeList = ref([])

const dialogVisible = ref(false)
const dialogType = ref('create')
const currentEditId = ref(null)
const submitLoading = ref(false)
const formRef = ref(null)

const formData = reactive({
  name: '',
  description: ''
})

const formRules = {
  name: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' }
  ]
}

function openCreateDialog() {
  dialogType.value = 'create'
  currentEditId.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogType.value = 'edit'
  currentEditId.value = row._id
  formData.name = row.name
  formData.description = row.description || ''
  dialogVisible.value = true
}

function goToDetail(row) {
  router.push(`/knowledge/${row._id}`)
}

function handleDialogClose() {
  formRef.value?.resetFields()
  currentEditId.value = null
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitLoading.value = true
  try {
    if (dialogType.value === 'create') {
      await knowledgeApi.create({
        name: formData.name,
        description: formData.description
      })
      ElMessage.success('创建成功')
    } else {
      await knowledgeApi.update(currentEditId.value, {
        name: formData.name,
        description: formData.description
      })
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchKnowledgeList()
  } catch (e) {
  } finally {
    submitLoading.value = false
  }
}

async function fetchKnowledgeList() {
  loading.value = true
  error.value = ''
  try {
    const data = await knowledgeApi.getList()
    knowledgeList.value = data.list || []
  } catch (e) {
    error.value = '获取知识库列表失败'
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除知识库「${row.name}」吗？删除后无法恢复。`,
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
    await knowledgeApi.delete(row._id)
    ElMessage.success('删除成功')
    await fetchKnowledgeList()
  } catch (e) {
  }
}

fetchKnowledgeList()
</script>

<style scoped>
.knowledge-content {
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

.list-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
