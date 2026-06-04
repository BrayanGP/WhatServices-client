<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import miLogo from '../assets/logoWhatServices.png'

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
  <div class="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-br from-brand-green to-brand-dark py-12">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
      <div class="flex flex-col items-center mb-6">
        <img :src="miLogo" alt="WhatServices" class="h-12 w-auto object-contain mb-2" />
        <h1 class="text-2xl font-bold text-brand-dark">Crear cuenta</h1>
        <p class="text-sm text-gray-500">Únete a WhatServices</p>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-4">{{ error }}</div>

      <input v-model="form.name" placeholder="Nombre completo"
        class="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
      <input v-model="form.email" type="email" placeholder="Correo electrónico"
        class="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
      <input v-model="form.phone" placeholder="Teléfono"
        class="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
      <input v-model="form.password" type="password" placeholder="Contraseña (mín. 6 caracteres)" @keyup.enter="submit"
        class="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-5 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />

      <button @click="submit" :disabled="loading"
        class="w-full bg-brand-green text-white py-2.5 rounded-lg hover:bg-brand-lightGreen disabled:opacity-50 font-semibold shadow-sm transition-all duration-200">
        {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
      </button>

      <p class="text-center text-sm text-gray-500 mt-5">
        ¿Ya tienes cuenta?
        <router-link to="/login" class="text-brand-green font-semibold hover:text-brand-lightGreen hover:underline">Ingresar</router-link>
      </p>
    </div>
  </div>
</template>
