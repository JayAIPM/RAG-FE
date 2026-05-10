import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import storage from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(storage.getToken() || '')
  const userInfo = ref(storage.getUserInfo() || null)

  const isLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    const data = await authApi.login(username, password)
    token.value = data.token
    userInfo.value = data.userInfo
    storage.setToken(data.token)
    storage.setUserInfo(data.userInfo)
    return data
  }

  async function logout() {
    await authApi.logout()
    token.value = ''
    userInfo.value = null
    storage.clearAll()
  }

  async function fetchUserInfo() {
    const data = await authApi.getUserInfo()
    userInfo.value = data
    storage.setUserInfo(data)
    return data
  }

  function setToken(newToken) {
    token.value = newToken
    storage.setToken(newToken)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout,
    fetchUserInfo,
    setToken
  }
})
