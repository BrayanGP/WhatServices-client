<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import ProviderCard from '../components/ProviderCard.vue'

const route = useRoute()
const store = useProvidersStore()
const page = ref(1)

const load = () => {
  page.value = 1
  store.fetchProviders({
    category: route.query.category,
    city: route.query.city,
    cp: route.query.cp,
    page: page.value,
    limit: 12,
  })
}

onMounted(load)
watch(() => route.query, load)
</script>

<template>
  <main class="max-w-6xl mx-auto py-10 px-4">
    <h1 class="text-2xl font-bold mb-2 text-gray-800">
      Proveedores
      <span v-if="route.query.category" class="text-blue-600"> · {{ route.query.category }}</span>
      <span v-if="route.query.city" class="text-gray-500 text-lg font-normal"> en {{ route.query.city }}</span>
      <span v-if="route.query.cp" class="text-gray-500 text-lg font-normal"> · CP {{ route.query.cp }}</span>
    </h1>
    <p class="text-sm text-gray-400 mb-6">{{ store.total }} resultados</p>

    <div v-if="store.loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else-if="store.providers.length === 0" class="text-center py-16 text-gray-400">
      No se encontraron proveedores con esos filtros.
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProviderCard v-for="p in store.providers" :key="p._id" :provider="p" />
    </div>
  </main>
</template>
