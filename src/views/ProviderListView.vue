<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import ProviderCard from '../components/ProviderCard.vue'

const route = useRoute()
const router = useRouter()
const store = useProvidersStore()
const page = ref(1)
const searchCategory = ref('')
const searchCity = ref('')
const searchCp = ref('')

const load = () => {
  page.value = 1
  searchCategory.value = route.query.category || ''
  searchCity.value = route.query.city || ''
  searchCp.value = route.query.cp || ''
  store.fetchProviders({
    category: route.query.category,
    city: route.query.city,
    cp: route.query.cp,
    page: page.value,
    limit: 12,
  })
}

const search = () => {
  router.push({
    path: '/providers',
    query: {
      category: searchCategory.value || undefined,
      city: searchCity.value || undefined,
      cp: searchCp.value || undefined,
    },
  })
}

onMounted(load)
watch(() => route.query, load)
</script>

<template>
  <main>
    <!-- Barra de filtro -->
    <section class="bg-gradient-to-br from-brand-green to-brand-dark text-white py-10 px-4">
      <div class="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2">
        <input
          v-model="searchCategory"
          placeholder="¿Qué servicio necesitas?"
          class="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen"
          @keyup.enter="search"
        />
        <input
          v-model="searchCity"
          placeholder="Ciudad"
          class="sm:w-40 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen"
          @keyup.enter="search"
        />
        <input
          v-model="searchCp"
          placeholder="Código postal"
          class="sm:w-36 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen"
          @keyup.enter="search"
        />
        <button
          @click="search"
          class="bg-brand-lightGreen text-brand-dark font-bold px-6 py-3 rounded-lg hover:bg-white hover:text-brand-green transition-all duration-200 shadow-md"
        >
          Buscar
        </button>
      </div>
    </section>

    <!-- Resultados -->
    <div class="max-w-6xl mx-auto py-10 px-4">
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
    </div>
  </main>
</template>
