<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProvidersStore } from '../stores/providers'
import { track } from '../lib/analytics'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const galleryModules = [Navigation, Pagination]
const galleryBreakpoints = {
  0: { slidesPerView: 1.2, spaceBetween: 12 },
  640: { slidesPerView: 2.2, spaceBetween: 14 },
  1024: { slidesPerView: 3, spaceBetween: 16 },
}

const route  = useRoute()
const router = useRouter()
const store  = useProvidersStore()
const API    = import.meta.env.VITE_API_URL || '/api'

const provider    = ref(null)
const reviews     = ref([])
const submitting  = ref(false)
const reviewError = ref('')
const reviewOk    = ref(false)
const lightboxIndex = ref(null) // índice de la foto ampliada (para el carrusel)

// ── Galería por categoría/álbum ──────────────────────────────────────────────
const galleryAlbum = ref('all')
// Categorías propias que realmente tienen fotos (además de "Todas")
const galleryAlbums = computed(() => {
  const fromList = provider.value?.albums || []
  const fromPhotos = (provider.value?.photos || []).flatMap((p) => p.albums || [])
  const custom = [...new Set([...fromList, ...fromPhotos])].filter((a) => a && a !== 'default' && a !== 'WhatsApp')
  return custom.filter((a) => (provider.value?.photos || []).some((p) => (p.albums || []).includes(a)))
})
const galleryPhotos = computed(() => {
  const all = provider.value?.photos || []
  if (galleryAlbum.value === 'all') return all
  return all.filter((p) => (p.albums || []).includes(galleryAlbum.value))
})

// ── deviceId: una reseña por dispositivo ─────────────────────────────────────
const getDeviceId = () => {
  let id = localStorage.getItem('ws_device_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('ws_device_id', id) }
  return id
}
const deviceId   = getDeviceId()
const myReview   = ref(null)   // reseña existente de este dispositivo
const isEditing  = ref(false)

const draft = ref({ rating: 5, comment: '', reviewerName: '' })
const hoverStar = ref(0)

const isMyReview = computed(() => !!myReview.value)

// ── Carga inicial ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const [p, r, mine] = await Promise.all([
    store.getProvider(route.params.id),
    fetch(`${API}/reviews/provider/${route.params.id}`).then(res => res.json()),
    fetch(`${API}/reviews/provider/${route.params.id}/device/${deviceId}`).then(res => res.json()),
  ])
  provider.value = p
  if (p?._id) track('provider_view', { id: p._id, name: p.businessName })
  reviews.value  = Array.isArray(r) ? r : []
  if (mine) {
    myReview.value = mine
    draft.value = { rating: mine.rating, comment: mine.comment || '', reviewerName: mine.reviewerName || '' }
  }
})

// ── Stars helpers ─────────────────────────────────────────────────────────────
const starClass = (n) => {
  const active = hoverStar.value || draft.value.rating
  return n <= active ? 'text-yellow-400' : 'text-gray-300'
}

// ── Enviar / editar reseña ────────────────────────────────────────────────────
const submitReview = async () => {
  if (!draft.value.reviewerName.trim()) { reviewError.value = 'Escribe tu nombre'; return }
  submitting.value = true
  reviewError.value = ''
  reviewOk.value = false
  try {
    const res = await fetch(`${API}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId:   route.params.id,
        rating:       draft.value.rating,
        comment:      draft.value.comment,
        reviewerName: draft.value.reviewerName,
        deviceId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error')

    // Actualizar lista
    if (myReview.value) {
      const idx = reviews.value.findIndex(r => r._id === myReview.value._id)
      if (idx !== -1) reviews.value[idx] = data
      else reviews.value.unshift(data)
    } else {
      reviews.value.unshift(data)
    }
    myReview.value = data
    isEditing.value = false
    reviewOk.value = true
    // Refrescar rating del proveedor
    const fresh = await store.getProvider(route.params.id)
    if (fresh) provider.value = fresh
  } catch (e) {
    reviewError.value = e.message
  } finally {
    submitting.value = false
  }
}

// ── Calificación promedio visual ──────────────────────────────────────────────
const avgStars = computed(() => {
  const avg = provider.value?.rating?.average || 0
  return Array.from({ length: 5 }, (_, i) => {
    const filled = i + 1 <= Math.floor(avg)
    const half   = !filled && i < avg
    return { filled, half }
  })
})

// Enlace de WhatsApp (wa.me) con mensaje prellenado
const waLink = computed(() => {
  const digits = String(provider.value?.phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const nombre = provider.value?.businessName || 'tu servicio'
  const msg = encodeURIComponent(`Hola 👋, te contacto desde WhatServices. Me interesa "${nombre}".`)
  return `https://wa.me/${digits}?text=${msg}`
})
</script>

<template>
  <!-- Lightbox (carrusel deslizable) -->
  <Teleport to="body">
    <div v-if="lightboxIndex !== null" @click.self="lightboxIndex = null"
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <button @click="lightboxIndex = null" aria-label="Cerrar"
        class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 text-white text-2xl flex items-center justify-center hover:bg-white/25 leading-none">✕</button>
      <Swiper
        :modules="galleryModules"
        :initial-slide="lightboxIndex"
        navigation
        :pagination="{ clickable: true }"
        class="ws-lightbox w-full h-full">
        <SwiperSlide v-for="(p, i) in galleryPhotos" :key="p.publicId || i" class="flex items-center justify-center">
          <img :src="p.url" @click.stop class="max-h-[88vh] max-w-[92vw] object-contain rounded-xl shadow-2xl" />
        </SwiperSlide>
      </Swiper>
    </div>
  </Teleport>

  <main v-if="provider" class="max-w-3xl mx-auto py-8 px-4 space-y-5">

    <!-- Botón regresar -->
    <button
      @click="router.back()"
      class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-green transition-colors group"
    >
      <span class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-brand-green group-hover:bg-brand-green/5 transition-colors">
        ←
      </span>
      Regresar
    </button>

    <!-- ── Tarjeta principal ── -->
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden">

      <!-- Banner verde superior -->
      <div class="h-24 bg-gradient-to-br from-brand-green to-brand-dark relative">
        <div class="absolute -bottom-8 left-6">
          <div v-if="provider.profilePhoto?.url"
            class="w-16 h-16 rounded-full ring-4 ring-white overflow-hidden shadow">
            <img :src="provider.profilePhoto.url" class="w-full h-full object-cover" />
          </div>
          <div v-else
            class="w-16 h-16 rounded-full ring-4 ring-white bg-brand-green/20 flex items-center justify-center text-2xl font-bold text-white shadow">
            {{ provider.businessName?.[0] }}
          </div>
        </div>
        <!-- Disponibilidad badge -->
        <span
          :class="provider.availability === 'available' ? 'bg-green-400' : 'bg-gray-400'"
          class="absolute top-3 right-4 text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {{ provider.availability === 'available' ? '● Disponible' : '○ No disponible' }}
        </span>
      </div>

      <div class="pt-12 px-6 pb-6">
        <h1 class="text-xl font-bold text-gray-900">{{ provider.businessName }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          📍 {{ provider.city }}{{ provider.address ? ` · ${provider.address}` : '' }}
        </p>

        <!-- Estrellas promedio -->
        <div class="flex items-center gap-2 mt-3">
          <div class="flex gap-0.5">
            <span v-for="(s, i) in avgStars" :key="i" class="text-xl"
              :class="s.filled ? 'text-yellow-400' : s.half ? 'text-yellow-300' : 'text-gray-200'">★</span>
          </div>
          <span class="text-sm font-semibold text-gray-700">{{ provider.rating?.average || 0 }}</span>
          <span class="text-sm text-gray-400">({{ provider.rating?.count || 0 }} reseñas)</span>
        </div>

        <p class="text-gray-600 text-sm mt-4 leading-relaxed">{{ provider.description }}</p>

        <!-- Categorías -->
        <div class="flex flex-wrap gap-2 mt-4">
          <span v-for="cat in provider.categories" :key="cat"
            class="bg-brand-green/10 text-brand-green text-xs px-3 py-1 rounded-full font-medium">
            {{ cat }}
          </span>
        </div>

        <!-- CTA WhatsApp -->
        <div class="mt-5">
          <a :href="waLink" target="_blank" rel="noopener noreferrer"
            @click="track('whatsapp_click', { id: provider._id, name: provider.businessName })"
            class="inline-flex items-center gap-2 bg-brand-green text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-lightGreen transition-colors shadow-sm">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.515 5.26l-.999 3.648 3.484-.911zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Enviar WhatsApp · {{ provider.phone }}
          </a>
        </div>
      </div>
    </div>

    <!-- ── Galería de fotos (carrusel) ── -->
    <div v-if="provider.photos?.length" class="bg-white rounded-2xl shadow-sm p-4">
      <h2 class="text-sm font-semibold text-gray-700 mb-3">Trabajos realizados</h2>
      <!-- Filtro por categoría (solo si el proveedor tiene categorías propias con fotos) -->
      <div v-if="galleryAlbums.length" class="flex flex-wrap gap-1.5 mb-3">
        <button type="button" @click="galleryAlbum = 'all'"
          :class="['text-xs px-2.5 py-1 rounded-full border transition-colors',
                   galleryAlbum === 'all' ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50']">Todas</button>
        <button v-for="a in galleryAlbums" :key="a" type="button" @click="galleryAlbum = a"
          :class="['text-xs px-2.5 py-1 rounded-full border transition-colors',
                   galleryAlbum === a ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50']">{{ a }}</button>
      </div>
      <Swiper
        :modules="galleryModules"
        :breakpoints="galleryBreakpoints"
        :slides-per-view="1.2"
        :space-between="12"
        navigation
        :pagination="{ clickable: true }"
        class="ws-gallery rounded-xl">
        <SwiperSlide v-for="(p, i) in galleryPhotos" :key="p.publicId || i" class="h-auto">
          <div @click="lightboxIndex = i"
            class="aspect-square rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity">
            <img :src="p.url" class="w-full h-full object-cover" />
          </div>
        </SwiperSlide>
      </Swiper>
    </div>

    <!-- ── Reseñas ── -->
    <div class="bg-white rounded-2xl shadow-sm p-6">
      <h2 class="text-base font-bold text-gray-800 mb-5">
        Reseñas
        <span class="text-brand-green">({{ reviews.length }})</span>
      </h2>

      <!-- Formulario reseña -->
      <div class="mb-6 pb-6 border-b border-gray-100">
        <!-- Ya tiene reseña y no está editando -->
        <div v-if="isMyReview && !isEditing"
          class="bg-brand-green/5 border border-brand-green/20 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-brand-green">Tu reseña</p>
            <button @click="isEditing = true; reviewOk = false"
              class="text-xs text-brand-green hover:underline">Editar</button>
          </div>
          <div class="flex gap-0.5 mb-1">
            <span v-for="n in 5" :key="n" class="text-base"
              :class="n <= myReview.rating ? 'text-yellow-400' : 'text-gray-200'">★</span>
          </div>
          <p class="text-sm text-gray-600">{{ myReview.comment || '(sin comentario)' }}</p>
          <div v-if="reviewOk" class="text-xs text-brand-green mt-2">✅ Reseña actualizada</div>
        </div>

        <!-- Formulario (nueva o edición) -->
        <div v-else>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">
            {{ isMyReview ? 'Editar tu reseña' : 'Escribe una reseña' }}
          </h3>

          <div v-if="reviewError" class="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{{ reviewError }}</div>

          <!-- Nombre -->
          <input v-model="draft.reviewerName" placeholder="Tu nombre *"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-green" />

          <!-- Estrellas clickeables -->
          <div class="flex gap-1 mb-3">
            <button v-for="n in 5" :key="n" type="button"
              @click="draft.rating = n"
              @mouseenter="hoverStar = n"
              @mouseleave="hoverStar = 0"
              class="text-3xl transition-colors leading-none"
              :class="starClass(n)">★</button>
            <span class="text-sm text-gray-500 self-center ml-2">{{ draft.rating }}/5</span>
          </div>

          <!-- Comentario -->
          <textarea v-model="draft.comment" rows="3"
            placeholder="Cuéntanos tu experiencia..."
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
          ></textarea>

          <div class="flex gap-2 mt-3">
            <button @click="submitReview" :disabled="submitting"
              class="flex-1 bg-brand-green text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50 transition-colors">
              {{ submitting ? 'Enviando...' : isMyReview ? 'Guardar cambios' : 'Publicar reseña' }}
            </button>
            <button v-if="isMyReview" @click="isEditing = false"
              class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de reseñas -->
      <div v-if="reviews.length === 0" class="text-center py-6 text-gray-400 text-sm">
        Aún no hay reseñas. ¡Sé el primero!
      </div>
      <div v-for="r in reviews" :key="r._id"
        class="py-4 border-b border-gray-50 last:border-0">
        <div class="flex items-start justify-between gap-2 mb-1">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center text-sm font-bold text-brand-green shrink-0">
              {{ (r.reviewerName || r.clientId?.name || 'C')[0].toUpperCase() }}
            </div>
            <span class="text-sm font-medium text-gray-800">
              {{ r.reviewerName || r.clientId?.name || 'Cliente' }}
            </span>
          </div>
          <div class="flex gap-0.5 shrink-0">
            <span v-for="n in 5" :key="n" class="text-sm"
              :class="n <= r.rating ? 'text-yellow-400' : 'text-gray-200'">★</span>
          </div>
        </div>
        <p v-if="r.comment" class="text-sm text-gray-600 ml-10">{{ r.comment }}</p>
        <p class="text-xs text-gray-400 ml-10 mt-1">
          {{ new Date(r.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) }}
        </p>
      </div>
    </div>

  </main>
  <div v-else class="flex items-center justify-center py-24 text-gray-400">
    <span class="animate-spin mr-2">⏳</span> Cargando...
  </div>
</template>

<style scoped>
/* Carrusel de trabajos: espacio para los bullets y flechas/paginación con color de marca */
.ws-gallery {
  padding-bottom: 28px;
}
.ws-gallery :deep(.swiper-button-next),
.ws-gallery :deep(.swiper-button-prev) {
  color: #16a34a; /* brand-green */
  --swiper-navigation-size: 24px;
}
.ws-gallery :deep(.swiper-pagination-bullet-active) {
  background: #16a34a;
}

/* Lightbox: carrusel a pantalla completa con flechas/bullets blancos */
.ws-lightbox :deep(.swiper-button-next),
.ws-lightbox :deep(.swiper-button-prev) {
  color: #ffffff;
  --swiper-navigation-size: 30px;
}
.ws-lightbox :deep(.swiper-pagination-bullet) {
  background: #ffffff;
  opacity: 0.5;
}
.ws-lightbox :deep(.swiper-pagination-bullet-active) {
  background: #ffffff;
  opacity: 1;
}
</style>
