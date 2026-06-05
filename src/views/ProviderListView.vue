<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import ProviderCard from '../components/ProviderCard.vue'

const API = import.meta.env.VITE_API_URL || '/api'

const route = useRoute()
const router = useRouter()
const store = useProvidersStore()
const page = ref(1)
const searchCategory = ref('')
const searchCity = ref('')
const searchCp = ref('')

// Selector de categorías (buscable)
const categories = ref([])
const catOpen = ref(false)
const catSearch = ref('')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const filteredCats = computed(() => {
  const q = norm(catSearch.value)
  return q ? categories.value.filter((c) => norm(c.name).includes(q)) : categories.value
})
const selectCat = (name) => { searchCategory.value = name; catOpen.value = false; catSearch.value = ''; search() }

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

onMounted(async () => {
  try { const r = await fetch(`${API}/categories`); categories.value = await r.json() } catch (e) { /* noop */ }
  load()
})
watch(() => route.query, load)
</script>

<template>
  <main>
    <!-- Barra de filtro -->
    <section class="bg-gradient-to-br from-brand-green to-brand-dark text-white py-10 px-4">
      <div class="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2">
        <!-- Selector de servicio (categorías) -->
        <div class="relative flex-1">
          <button type="button" @click="catOpen = !catOpen"
            class="w-full px-4 py-3 rounded-lg bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-lightGreen">
            <span :class="searchCategory ? 'text-gray-800' : 'text-gray-400'">{{ searchCategory || '¿Qué servicio necesitas?' }}</span>
            <span class="text-gray-400 text-xs">{{ catOpen ? '▲' : '▼' }}</span>
          </button>
          <div v-if="catOpen" class="fixed inset-0 z-10" @click="catOpen = false"></div>
          <div v-if="catOpen" class="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            <div class="p-2 border-b border-gray-100">
              <input v-model="catSearch" placeholder="Buscar categoría..."
                class="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-lightGreen" />
            </div>
            <ul class="max-h-60 overflow-y-auto text-gray-800">
              <li>
                <button type="button" @click="selectCat('')" class="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-brand-light/60">Cualquier servicio</button>
              </li>
              <li v-for="c in filteredCats" :key="c._id">
                <button type="button" @click="selectCat(c.name)"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-brand-light/60 flex items-center gap-2"
                  :class="searchCategory === c.name ? 'bg-brand-green/10 text-brand-medium font-medium' : ''">
                  <span>{{ c.icon || '🔧' }}</span> {{ c.name }}
                </button>
              </li>
              <li v-if="!filteredCats.length" class="px-4 py-3 text-sm text-gray-400">Sin coincidencias</li>
            </ul>
          </div>
        </div>
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
