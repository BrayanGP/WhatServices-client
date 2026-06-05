import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API = import.meta.env.VITE_API_URL || '/api'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('accessToken'))
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!accessToken.value)

  const _persist = (token, userData) => {
    accessToken.value = token
    user.value = userData
    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  // credentials: { phone, password } (cliente) o { email, password }
  const login = async (credentials) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    })
    if (!res.ok) throw new Error((await res.json()).message)
    const data = await res.json()
    _persist(data.accessToken, data.user)
    return data
  }

  const register = async (payload) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error((await res.json()).message)
    const data = await res.json()
    _persist(data.accessToken, data.user)
    return data
  }

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
    accessToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
  }

  const authFetch = async (url, options = {}) => {
    let res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken.value}` },
      credentials: 'include',
    })
    if (res.status === 401) {
      const refreshRes = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (refreshRes.ok) {
        const { accessToken: newToken } = await refreshRes.json()
        accessToken.value = newToken
        localStorage.setItem('accessToken', newToken)
        res = await fetch(url, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
          credentials: 'include',
        })
      } else {
        await logout()
      }
    }
    return res
  }

  return { accessToken, user, isLoggedIn, login, register, logout, authFetch }
})
