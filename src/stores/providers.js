import { defineStore } from 'pinia'
import { ref } from 'vue'

const API = import.meta.env.VITE_API_URL || '/api'

export const useProvidersStore = defineStore('providers', () => {
  const providers = ref([])
  const total = ref(0)
  const loading = ref(false)

  const fetchProviders = async (params = {}) => {
    loading.value = true
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString()
    const res = await fetch(`${API}/providers?${query}`)
    const data = await res.json()
    providers.value = data.providers
    total.value = data.total
    loading.value = false
    return data
  }

  const getProvider = async (id) => {
    const res = await fetch(`${API}/providers/${id}`)
    return res.json()
  }

  return { providers, total, loading, fetchProviders, getProvider }
})
