<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const submit = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="bg-white rounded-xl shadow p-8 w-full max-w-sm">
      <h1 class="text-2xl font-bold mb-6 text-center text-gray-900">Ingresar</h1>
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-4">{{ error }}</div>
      <input v-model="email" type="email" placeholder="Correo electrónico" class="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <input v-model="password" type="password" placeholder="Contraseña" class="w-full border rounded-lg px-3 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-300" @keyup.enter="submit" />
      <button @click="submit" :disabled="loading" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
        {{ loading ? 'Ingresando...' : 'Ingresar' }}
      </button>
      <p class="text-center text-sm text-gray-500 mt-4">
        ¿No tienes cuenta? <router-link to="/register" class="text-blue-600 hover:underline">Regístrate</router-link>
      </p>
    </div>
  </div>
</template>
