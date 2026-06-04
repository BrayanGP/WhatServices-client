<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import ProviderCard from '../components/ProviderCard.vue'

const router = useRouter()
const store = useProvidersStore()
const searchCategory = ref('')

onMounted(() => store.fetchProviders({ limit: 6 }))

const search = () => {
  router.push({ path: '/providers', query: { category: searchCategory.value } })
}
</script>

<template>
  <main>
    <section class="bg-gradient-to-br from-brand-light to-brand-medium text-white py-20 px-4 text-center">
      <img src="/logo.svg" alt="WhatServices" class="w-20 h-20 mx-auto mb-4 drop-shadow" />
      <h1 class="text-4xl font-bold mb-2">
        <span class="text-white">What</span><span class="text-brand-base">Services</span>
      </h1>
      <p class="text-green-50 mb-8 text-lg">Los mejores servicios cerca de ti, a un mensaje de distancia.</p>
      <div class="max-w-xl mx-auto flex flex-col sm:flex-row gap-2">
        <input
          v-model="searchCategory"
          placeholder="¿Qué servicio buscas? (plomería, carpintería...)"
          class="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-base"
          @keyup.enter="search"
        />
        <button @click="search" class="bg-brand-base text-white font-semibold px-6 py-3 rounded-lg hover:brightness-110 transition">
          Buscar
        </button>
      </div>
      <router-link to="/unete" class="inline-block mt-6 text-green-50 underline hover:text-white text-sm">
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
        <router-link to="/providers" class="text-brand-light hover:underline font-medium">Ver todos los profesionales →</router-link>
      </div>
    </section>
  </main>
</template>
