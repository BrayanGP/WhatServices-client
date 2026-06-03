<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ name: '', email: '', phone: '', password: '' })
const error = ref('')
const loading = ref(false)

const submit = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.register(form.value)
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
      <h1 class="text-2xl font-bold mb-6 text-center text-gray-900">Crear cuenta</h1>
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-4">{{ error }}</div>
      <input v-model="form.name" placeholder="Nombre completo" class="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <input v-model="form.email" type="email" placeholder="Correo electrónico" class="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <input v-model="form.phone" placeholder="Teléfono" class="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <input v-model="form.password" type="password" placeholder="Contraseña (mín. 6 caracteres)" class="w-full border rounded-lg px-3 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <button @click="submit" :disabled="loading" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
        {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
      </button>
      <p class="text-center text-sm text-gray-500 mt-4">
        ¿Ya tienes cuenta? <router-link to="/login" class="text-blue-600 hover:underline">Ingresar</router-link>
      </p>
    </div>
  </div>
</template>
