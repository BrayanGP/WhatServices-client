<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import ProviderCard from '../components/ProviderCard.vue'

const router = useRouter()
const store = useProvidersStore()
const searchCategory = ref('')
const searchCity = ref('')

onMounted(() => store.fetchProviders({ limit: 6 }))

const search = () => {
  router.push({ path: '/providers', query: { category: searchCategory.value, city: searchCity.value } })
}
</script>

<template>
  <main>
    <section class="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20 px-4 text-center">
      <h1 class="text-4xl font-bold mb-3">Encuentra servicios locales</h1>
      <p class="text-blue-100 mb-8 text-lg">Carpinteros, plomeros, electricistas y más en tu ciudad</p>
      <div class="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2">
        <input
          v-model="searchCategory"
          placeholder="¿Qué servicio necesitas?"
          class="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <input
          v-model="searchCity"
          placeholder="Ciudad"
          class="sm:w-44 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          @click="search"
          class="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Buscar
        </button>
      </div>
    </section>

    <section class="max-w-6xl mx-auto py-12 px-4">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Proveedores destacados</h2>
      <div v-if="store.loading" class="text-center py-12 text-gray-400">Cargando...</div>
      <div v-else-if="store.providers.length === 0" class="text-center py-12 text-gray-400">
        No hay proveedores registrados aún.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProviderCard v-for="p in store.providers" :key="p._id" :provider="p" />
      </div>
      <div class="text-center mt-8">
        <router-link to="/providers" class="text-blue-600 hover:underline font-medium">Ver todos los proveedores →</router-link>
      </div>
    </section>
  </main>
</template>
