<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter, useRoute } from 'vue-router'
import miLogo from '../assets/logoWhatServices.png'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()
const isOpen = ref(false)

// ── Sesión cliente (localStorage) ────────────────────────────────────────────
const CLIENT_KEY      = 'ws_client_phone'
const CLIENT_NAME_KEY = 'ws_client_name'

const clientPhone = ref(localStorage.getItem(CLIENT_KEY) || '')
const clientName  = ref(localStorage.getItem(CLIENT_NAME_KEY) || '')
const isClient    = computed(() => !auth.isLoggedIn && !!clientPhone.value)

const syncClientSession = () => {
  clientPhone.value = localStorage.getItem(CLIENT_KEY) || ''
  clientName.value  = localStorage.getItem(CLIENT_NAME_KEY) || ''
}

// Actualiza al cambiar ruta (login redirect) o al recibir evento de registro inline
watch(() => route.fullPath, syncClientSession)
onMounted(() => window.addEventListener('ws-client-session', syncClientSession))
onUnmounted(() => window.removeEventListener('ws-client-session', syncClientSession))

const logoutClient = () => {
  localStorage.removeItem(CLIENT_KEY)
  localStorage.removeItem(CLIENT_NAME_KEY)
  clientPhone.value = ''
  clientName.value  = ''
  isOpen.value = false
  router.push('/')
}

// ── Sesión profesional ────────────────────────────────────────────────────────
const logout = async () => {
  await auth.logout()
  isOpen.value = false
  router.push('/')
}
</script>

<template>
  <nav class="bg-white border-b border-brand-dark/10 sticky top-0 z-10">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

      <router-link :to="auth.isLoggedIn || isClient ? '/providers' : '/'" class="flex items-center gap-3" @click="isOpen = false">
        <div class="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm ring-1 ring-brand-dark/10">
          <img :src="miLogo" alt="WhatServices" class="h-8 w-8 object-contain" />
        </div>
        <h1 class="text-lg font-bold leading-tight">
          <span class="text-brand-dark">What</span><span class="text-brand-green">Services</span>
        </h1>
      </router-link>

      <button @click="isOpen = !isOpen" class="text-gray-600 hover:text-brand-green focus:outline-none md:hidden" aria-label="Menu">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path v-if="isOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Desktop -->
      <div class="hidden md:flex flex-1 items-center justify-between ml-10">
        <div></div>
        <div class="flex items-center gap-4">

          <!-- Profesional logueado -->
          <template v-if="auth.isLoggedIn">
            <router-link to="/providers" class="text-brand-dark hover:text-brand-green text-sm font-semibold transition-colors">
              Profesionales
            </router-link>
            <span title="Créditos disponibles (suscripción)"
              class="inline-flex items-center gap-1 bg-brand-green/10 text-brand-green text-xs font-bold px-2.5 py-1 rounded-full">
              💳 Créditos: ∞
            </span>
            <router-link to="/mi-perfil" class="text-brand-dark hover:text-brand-green text-sm font-semibold flex items-center gap-1 transition-colors">
              <svg class="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{{ auth.user?.name || 'Mi perfil' }}</span>
            </router-link>
            <button @click="logout" class="text-sm text-red-500 hover:text-red-700 font-semibold ml-2 transition-colors">Salir</button>
          </template>

          <!-- Cliente logueado -->
          <template v-else-if="isClient">
            <router-link to="/providers" class="text-brand-dark hover:text-brand-green text-sm font-semibold transition-colors">
              Clientes
            </router-link>
            <span class="text-brand-dark hover:text-brand-green text-sm font-semibold flex items-center gap-1">
              <svg class="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{{ clientName || clientPhone }}</span>
            </span>
            <button @click="logoutClient" class="text-sm text-red-500 hover:text-red-700 font-semibold ml-2 transition-colors">Salir</button>
          </template>

          <!-- Sin sesión -->
          <template v-else>
            <router-link to="/login" class="border border-brand-green text-brand-green hover:bg-brand-green hover:text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200">
              Ingresar
            </router-link>
            <router-link to="/unete" class="bg-brand-green text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-lightGreen font-semibold shadow-sm transition-all duration-200">
              Únete como profesional
            </router-link>
          </template>

        </div>
      </div>
    </div>

    <!-- Menú móvil -->
    <div v-if="isOpen" class="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4 shadow-inner">

      <!-- Profesional logueado -->
      <template v-if="auth.isLoggedIn">
        <div class="border-t border-gray-100 pt-3 flex flex-col gap-3">
          <span class="inline-flex items-center gap-1 bg-brand-green/10 text-brand-green text-xs font-bold px-2.5 py-1 rounded-full w-fit">
            💳 Créditos: ∞
          </span>
          <router-link to="/providers" class="text-sm font-semibold text-brand-dark py-1" @click="isOpen = false">
            Profesionales
          </router-link>
          <router-link to="/mi-perfil" class="text-sm font-semibold text-brand-dark py-1" @click="isOpen = false">
            Mi perfil ({{ auth.user?.name }})
          </router-link>
          <button @click="logout" class="text-left text-sm text-red-500 hover:text-red-700 py-1 font-semibold transition-colors">Salir</button>
        </div>
      </template>

      <!-- Cliente logueado -->
      <template v-else-if="isClient">
        <div class="border-t border-gray-100 pt-3 flex flex-col gap-3">
          <router-link to="/providers" class="text-sm font-semibold text-brand-dark py-1" @click="isOpen = false">
            Clientes
          </router-link>
          <span class="text-sm font-semibold text-brand-dark py-1 flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {{ clientName || clientPhone }}
          </span>
          <button @click="logoutClient" class="text-left text-sm text-red-500 hover:text-red-700 py-1 font-semibold transition-colors">Salir</button>
        </div>
      </template>

      <!-- Sin sesión -->
      <template v-else>
        <div class="flex flex-col gap-3">
          <router-link to="/login" class="border border-brand-green text-brand-green hover:bg-brand-green hover:text-white px-4 py-2 rounded-lg text-sm font-semibold text-center shadow-sm transition-all" @click="isOpen = false">
            Ingresar
          </router-link>
          <router-link to="/unete" class="bg-brand-green text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-lightGreen text-center font-semibold shadow-sm transition-all" @click="isOpen = false">
            Únete como profesional
          </router-link>
        </div>
      </template>

    </div>
  </nav>
</template>
