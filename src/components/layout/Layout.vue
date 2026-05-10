<template>
  <div class="layout-container">
    <el-container class="layout-wrapper">
      <el-aside width="200px" class="sidebar">
        <div class="sidebar-header">
          <h1 class="logo-title">RAG知识库</h1>
        </div>
        <el-menu
          :default-active="$route.path"
          class="sidebar-menu"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon class="menu-icon"><HomeFilled /></el-icon>
            <span>工作台</span>
          </el-menu-item>
          <el-menu-item index="/knowledge">
            <el-icon class="menu-icon"><FolderOpened /></el-icon>
            <span>知识库管理</span>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon class="menu-icon"><ChatDotRound /></el-icon>
            <span>智能问答</span>
          </el-menu-item>
        </el-menu>
        <div class="sidebar-footer">
          <span class="user-name">{{ userInfo?.username || '未登录' }}</span>
          <el-button text class="logout-btn" @click="handleLogout">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </el-aside>

      <el-main class="main-content">
        <router-view :key="$route.fullPath" />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { HomeFilled, FolderOpened, ChatDotRound, Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100%;
}

.layout-wrapper {
  height: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #304156;
  border-bottom: 1px solid #3d4a5c;
  flex-shrink: 0;
}

.logo-title {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

.menu-icon {
  margin-right: 8px;
}

.sidebar-footer {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background-color: #304156;
  border-top: 1px solid #3d4a5c;
  flex-shrink: 0;
}

.user-name {
  color: #bfcbd9;
  font-size: 14px;
}

.logout-btn {
  color: #bfcbd9;
}

.logout-btn:hover {
  color: #fff;
}

.main-content {
  padding: 0;
  background-color: #f0f2f5;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
