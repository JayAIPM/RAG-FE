const TOKEN_KEY = 'rag_token'
const USER_INFO_KEY = 'rag_user_info'

const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },
  
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
  },
  
  removeToken() {
    localStorage.removeItem(TOKEN_KEY)
  },
  
  getUserInfo() {
    const info = localStorage.getItem(USER_INFO_KEY)
    return info ? JSON.parse(info) : null
  },
  
  setUserInfo(userInfo) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
  },
  
  removeUserInfo() {
    localStorage.removeItem(USER_INFO_KEY)
  },
  
  clearAll() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }
}

export default storage
