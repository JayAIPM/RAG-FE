import request from '@/api/index'

export const authApi = {
  async login(username, password) {
    const data = await request.post('/auth/login', { username, password })
    return data
  },

  async logout() {
    const data = await request.post('/auth/logout')
    return data
  },

  async getUserInfo() {
    const data = await request.get('/auth/user-info')
    return data
  }
}
