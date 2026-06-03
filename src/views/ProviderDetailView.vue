<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const store = useProvidersStore()
const auth = useAuthStore()
const provider = ref(null)
const reviews = ref([])
const newReview = ref({ rating: 5, comment: '' })
const submitting = ref(false)
const reviewError = ref('')

const API = import.meta.env.VITE_API_URL

onMounted(async () => {
  const [p, r] = await Promise.all([
    store.getProvider(route.params.id),
    fetch(`${API}/reviews/provider/${route.params.id}`).then((res) => res.json()),
  ])
  provider.value = p
  reviews.value = r
})

const submitReview = async () => {
  submitting.value = true
  reviewError.value = ''
  try {
    const res = await auth.authFetch(`${API}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: route.params.id, ...newReview.value }),
    })
    if (res.ok) {
      const r = await res.json()
      reviews.value.unshift(r)
      newReview.value = { rating: 5, comment: '' }
    } else {
      reviewError.value = (await res.json()).message
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main v-if="provider" class="max-w-3xl mx-auto py-10 px-4">
    <div class="bg-white rounded-xl shadow p-6 mb-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
          {{ provider.businessName?.[0] }}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ provider.businessName }}</h1>
          <p class="text-gray-500">{{ provider.city }}{{ provider.address ? ` · ${provider.address}` : '' }}</p>
        </div>
      </div>
      <p class="text-gray-700 mb-4">{{ provider.description }}</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <span v-for="cat in provider.categories" :key="cat" class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{{ cat }}</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-yellow-500 font-semibold">★ {{ provider.rating?.average }} ({{ provider.rating?.count }})</span>
        <a :href="`tel:${provider.phone}`" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          📞 {{ provider.phone }}
        </a>
      </div>
    </div>

    <div v-if="provider.photos?.length" class="grid grid-cols-3 gap-2 mb-6">
      <img v-for="p in provider.photos" :key="p.publicId" :src="p.url" class="rounded-lg object-cover h-32 w-full" />
    </div>

    <div class="bg-white rounded-xl shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Reseñas ({{ reviews.length }})</h2>

      <div v-if="auth.isLoggedIn && auth.user?.role === 'client'" class="mb-6 border-b pb-5">
        <h3 class="text-sm font-medium mb-3 text-gray-700">Escribe una reseña</h3>
        <div v-if="reviewError" class="text-red-500 text-xs mb-2">{{ reviewError }}</div>
        <select v-model.number="newReview.rating" class="border rounded px-2 py-1 mb-2 text-sm">
          <option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ '★'.repeat(n) }} ({{ n }})</option>
        </select>
        <textarea
          v-model="newReview.comment"
          rows="3"
          class="w-full border rounded-lg px-3 py-2 text-sm block"
          placeholder="Cuéntanos tu experiencia..."
        ></textarea>
        <button
          @click="submitReview"
          :disabled="submitting"
          class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {{ submitting ? 'Enviando...' : 'Enviar reseña' }}
        </button>
      </div>

      <div v-if="reviews.length === 0" class="text-gray-400 text-sm">Sin reseñas aún.</div>
      <div v-for="r in reviews" :key="r._id" class="py-3 border-b last:border-0">
        <div class="flex justify-between mb-1">
          <span class="font-medium text-sm">{{ r.clientId?.name || 'Cliente' }}</span>
          <span class="text-yellow-500 text-sm">{{ '★'.repeat(r.rating) }}</span>
        </div>
        <p class="text-gray-600 text-sm">{{ r.comment }}</p>
      </div>
    </div>
  </main>
  <div v-else class="text-center py-16 text-gray-400">Cargando...</div>
</template>
