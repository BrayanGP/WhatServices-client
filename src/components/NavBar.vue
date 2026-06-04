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
  <nav class="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-2">
        <img src="/logo.svg" alt="WhatServices" class="w-8 h-8" />
        <span class="text-xl font-bold">
          <span class="text-brand-dark">What</span><span class="text-brand-base">Services</span>
        </span>
      </router-link>
      <div class="flex items-center gap-4">
        <router-link to="/providers" class="text-gray-600 hover:text-brand-light text-sm">Profesionales</router-link>
        <template v-if="auth.isLoggedIn">
          <router-link to="/mi-perfil" class="text-gray-600 hover:text-brand-light text-sm">Mi perfil</router-link>
          <button @click="logout" class="text-sm text-red-500 hover:text-red-700">Salir</button>
        </template>
        <template v-else>
          <router-link to="/login" class="text-gray-600 hover:text-brand-light text-sm">Ingresar</router-link>
          <router-link to="/unete" class="bg-brand-base text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-light transition-colors font-medium">
            Únete como profesional
          </router-link>
        </template>
      </div>
    </div>
  </nav>
</template>
