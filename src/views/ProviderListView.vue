<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import { track } from '../lib/analytics'
import ProviderCard from '../components/ProviderCard.vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'

const API = import.meta.env.VITE_API_URL || '/api'

const route = useRoute()
const router = useRouter()
const store = useProvidersStore()
const page = ref(1)
const searchCategory = ref('')
const searchCity = ref('')
const searchCp = ref('')

// ¿Está buscando con filtros? Si no, mostramos navegación por categorías.
const isSearch = computed(() => !!(route.query.category || route.query.city || route.query.cp))

// Selector de categorías (buscable)
const categories = ref([])
const catOpen = ref(false)
const catSearch = ref('')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Navegación por categorías (carruseles)
const groups = ref([])
const browseLoading = ref(false)

// Categorías para el selector: las del admin MÁS las que realmente usan los proveedores.
// Así el desplegable no queda vacío aunque el admin aún no haya aprobado categorías.
const browseCats = computed(() => {
  const m = new Map(categories.value.map((c) => [norm(c.name), { _id: c._id, name: c.name, icon: c.icon || '🔧' }]))
  for (const g of groups.value) {
    if (g.name === 'Otros servicios') continue
    const k = norm(g.name)
    if (!m.has(k)) m.set(k, { _id: k, name: g.name, icon: g.icon || '🔧' })
  }
  for (const p of store.providers) {
    for (const name of (p.categories || [])) {
      const k = norm(name)
      if (!m.has(k)) m.set(k, { _id: k, name, icon: '🔧' })
    }
  }
  return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
})
const filteredCats = computed(() => {
  const q = norm(catSearch.value)
  return q ? browseCats.value.filter((c) => norm(c.name).includes(q)) : browseCats.value
})
const selectCat = (name) => { searchCategory.value = name; catOpen.value = false; catSearch.value = ''; search() }

const swiperBreakpoints = {
  0: { slidesPerView: 1.15, spaceBetween: 12 },
  640: { slidesPerView: 2.2, spaceBetween: 16 },
  1024: { slidesPerView: 3.2, spaceBetween: 20 },
}

const loadGrouped = async () => {
  browseLoading.value = true
  try {
    const data = await fetch(`${API}/providers?limit=300`).then((r) => r.json())
    const provs = data.providers || []
    // Agrupamos por las categorías REALES de cada proveedor (no solo por las del admin),
    // para que los proveedores siempre aparezcan aunque su categoría aún esté pendiente.
    // Los que no tengan categoría caen en "Otros servicios".
    const iconByName = new Map(categories.value.map((c) => [norm(c.name), c.icon || '🔧']))
    const map = new Map() // key: nombre normalizado → { name, icon, providers: [] }
    for (const p of provs) {
      const cats = (p.categories && p.categories.length) ? p.categories : ['Otros servicios']
      for (const cat of cats) {
        const key = norm(cat)
        if (!map.has(key)) map.set(key, { name: cat, icon: iconByName.get(key) || '🔧', providers: [] })
        const g = map.get(key)
        if (g.providers.length < 10 && !g.providers.some((x) => x._id === p._id)) g.providers.push(p)
      }
    }
    groups.value = Array.from(map.values())
      .filter((g) => g.providers.length)
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) { groups.value = [] }
  finally { browseLoading.value = false }
}

const load = () => {
  page.value = 1
  searchCategory.value = route.query.category || ''
  searchCity.value = route.query.city || ''
  searchCp.value = route.query.cp || ''
  if (isSearch.value) {
    store.fetchProviders({ category: route.query.category, city: route.query.city, cp: route.query.cp, page: page.value, limit: 12 })
  } else {
    loadGrouped()
  }
}

const search = () => {
  track('search', { category: searchCategory.value || '', city: searchCity.value || '', cp: searchCp.value || '' })
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
  try { categories.value = await fetch(`${API}/categories`).then((r) => r.json()) } catch (e) { /* noop */ }
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
        <input v-model="searchCity" placeholder="Ciudad"
          class="sm:w-40 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" @keyup.enter="search" />
        <input v-model="searchCp" placeholder="Código postal"
          class="sm:w-36 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" @keyup.enter="search" />
        <button @click="search"
          class="bg-brand-lightGreen text-brand-dark font-bold px-6 py-3 rounded-lg hover:bg-white hover:text-brand-green transition-all duration-200 shadow-md">
          Buscar
        </button>
      </div>
    </section>

    <div class="max-w-6xl mx-auto py-10 px-4">
      <!-- ── Resultados de búsqueda (lista) ── -->
      <template v-if="isSearch">
        <h1 class="text-2xl font-bold mb-2 text-gray-800">
          Proveedores
          <span v-if="route.query.category" class="text-brand-green"> · {{ route.query.category }}</span>
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
      </template>

      <!-- ── Navegación por categorías (carruseles) ── -->
      <template v-else>
        <div v-if="browseLoading" class="text-center py-16 text-gray-400">Cargando...</div>
        <div v-else-if="!groups.length" class="text-center py-16 text-gray-400">Aún no hay profesionales registrados.</div>
        <div v-else class="space-y-12">
          <section v-for="g in groups" :key="g.name">
            <!-- Divider con nombre de categoría -->
            <div class="flex items-center gap-3 mb-4">
              <h2 class="text-xl font-bold text-brand-dark whitespace-nowrap">{{ g.icon }} {{ g.name }}</h2>
              <div class="flex-1 h-px bg-gray-200"></div>
              <router-link :to="`/providers?category=${encodeURIComponent(g.name)}`"
                class="text-sm text-brand-green hover:text-brand-lightGreen hover:underline font-medium shrink-0">Ver todos →</router-link>
            </div>
            <!-- Carrusel (máx 10) -->
            <Swiper :breakpoints="swiperBreakpoints" :slides-per-view="1.15" :space-between="12" class="pb-2">
              <SwiperSlide v-for="p in g.providers" :key="p._id" class="h-auto">
                <ProviderCard :provider="p" />
              </SwiperSlide>
            </Swiper>
          </section>
        </div>
      </template>
    </div>
  </main>
</template>
