<script setup>
import { onMounted } from 'vue'
import { useProvidersStore } from '../stores/providers'
import { useAuthStore } from '../stores/auth'
import ProviderCard from '../components/ProviderCard.vue'

const store = useProvidersStore()
const auth = useAuthStore()

onMounted(() => { if (!auth.isLoggedIn) store.fetchProviders({ limit: 6 }) })
</script>

<template>
  <main>
    <!-- Vista PROFESIONAL logueado: no se muestran otros prestadores -->
    <section v-if="auth.isLoggedIn" class="bg-gradient-to-br from-brand-green to-brand-dark text-white py-24 px-4 text-center">
      <h1 class="text-3xl font-bold mb-2">¡Hola{{ auth.user?.name ? ', ' + auth.user.name : '' }}! 👋</h1>
      <p class="text-brand-lightGreen/90 mb-8 text-lg">Gestiona tu perfil profesional en WhatServices.</p>
      <router-link to="/mi-perfil" class="bg-brand-lightGreen text-brand-dark font-bold px-6 py-3 rounded-lg hover:bg-white hover:text-brand-green transition-all shadow-md">
        Ir a mi perfil
      </router-link>
    </section>

    <!-- Vista PÚBLICA / cliente -->
    <template v-else>
      <section class="bg-gradient-to-br from-brand-green to-brand-dark text-white py-20 px-4 text-center">
        <h1 class="text-4xl font-bold mb-3">Encuentra servicios locales</h1>
        <p class="text-brand-lightGreen/90 mb-8 text-lg">Carpinteros, plomeros, electricistas y más en tu ciudad</p>

        <div class="flex justify-center">
          <router-link to="/providers"
            class="bg-brand-lightGreen text-brand-dark font-bold text-xl px-10 py-4 rounded-xl hover:bg-white hover:text-brand-green transition-all duration-200 shadow-lg">
            Buscar servicios
          </router-link>
        </div>

        <router-link to="/unete" class="inline-block mt-6 text-brand-lightGreen underline hover:text-white text-sm">
          ¿Eres profesional? Únete y recibe clientes →
        </router-link>
      </section>

      <section class="max-w-6xl mx-auto py-12 px-4">
        <h2 class="text-2xl font-bold mb-6 text-brand-dark">Profesionales destacados</h2>
        <div v-if="store.loading" class="text-center py-12 text-gray-400">Cargando...</div>
        <div v-else-if="store.providers.length === 0" class="text-center py-12 text-gray-400">
          Aún no hay profesionales registrados.
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProviderCard v-for="p in store.providers" :key="p._id" :provider="p" />
        </div>
        <div class="text-center mt-8">
          <router-link to="/providers" class="text-brand-green hover:text-brand-lightGreen font-semibold inline-flex items-center gap-1 transition-colors">
            Ver todos los profesionales →
          </router-link>
        </div>
      </section>
    </template>
  </main>
</template>
