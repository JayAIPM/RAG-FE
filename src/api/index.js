import axios from 'axios'
import { ElMessage } from 'element-plus'
import storage from '@/utils/storage'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const instance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

instance.interceptors.request.use(
  (config) => {
    const token = storage.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (response) => {
    const { code, msg, data } = response.data
    
    if (code === 0) {
      return data
    } else {
      ElMessage.error(msg || '请求失败')
      return Promise.reject(new Error(msg || '请求失败'))
    }
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          storage.removeToken()
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('您没有权限执行此操作')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error(data?.msg || '服务器异常，请稍后重试')
          break
        default:
          ElMessage.error(data?.msg || '请求失败')
      }
    } else {
      ElMessage.error('网络连接失败，请检查网络')
    }
    return Promise.reject(error)
  }
)

export default instance
