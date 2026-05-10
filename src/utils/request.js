import { ElMessage } from 'element-plus'
import storage from '@/utils/storage'

export async function request(url, options = {}) {
  const token = storage.getToken()

  const defaultHeaders = {
    'Content-Type': 'application/json'
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  })

  if (response.status === 401) {
    storage.removeToken()
    window.location.href = '/login'
    throw new Error('登录已过期')
  }

  if (response.status === 403) {
    ElMessage.error('您没有权限执行此操作')
    throw new Error('无权限')
  }

  if (response.status === 404) {
    ElMessage.error('请求的资源不存在')
    throw new Error('资源不存在')
  }

  if (response.status >= 500) {
    ElMessage.error('服务器异常，请稍后重试')
    throw new Error('服务器异常')
  }

  const data = await response.json()

  if (data.code !== 0) {
    ElMessage.error(data.msg || '请求失败')
    throw new Error(data.msg || '请求失败')
  }

  return data
}

export async function requestStream(url, options = {}) {
  const token = storage.getToken()

  const defaultHeaders = {
    'Content-Type': 'application/json'
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  })

  if (response.status === 401) {
    storage.removeToken()
    window.location.href = '/login'
    throw new Error('登录已过期')
  }

  if (response.status === 403) {
    ElMessage.error('您没有权限执行此操作')
    throw new Error('无权限')
  }

  if (!response.ok) {
    ElMessage.error('请求失败')
    throw new Error('请求失败')
  }

  return response
}
