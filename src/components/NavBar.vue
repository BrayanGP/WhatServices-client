<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const logout = async () => {
  await auth.logout()
  router.push('/')
}
</script>

<template>
  <nav class="bg-white shadow-sm sticky top-0 z-10">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <router-link to="/" class="text-xl font-bold text-blue-600">WhatServices</router-link>
      <div class="flex items-center gap-4">
        <router-link to="/providers" class="text-gray-600 hover:text-blue-600 text-sm">Proveedores</router-link>
        <template v-if="auth.isLoggedIn">
          <span class="text-sm text-gray-500">{{ auth.user?.name }}</span>
          <button @click="logout" class="text-sm text-red-500 hover:text-red-700">Salir</button>
        </template>
        <template v-else>
          <router-link to="/login" class="text-gray-600 hover:text-blue-600 text-sm">Ingresar</router-link>
          <router-link to="/register" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Registrarse
          </router-link>
        </template>
      </div>
    </div>
  </nav>
</template>
