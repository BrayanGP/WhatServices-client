<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const API = import.meta.env.VITE_API_URL || '/api'
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || window.location.origin
const router = useRouter()
const auth = useAuthStore()

const provider = ref(null)
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const msg = ref('')
const lightbox = ref(null)

// Detección de cambios (dirty) y validación de categorías
const original = ref('')
const snap = () => JSON.stringify({
  businessName: provider.value?.businessName || '',
  description: provider.value?.description || '',
  city: provider.value?.city || '',
  postalCode: provider.value?.postalCode || '',
  categories: [...(provider.value?.categories || [])].sort(),
  availability: provider.value?.availability || '',
})
const dirty = computed(() => !!provider.value && snap() !== original.value)
const hasCategory = computed(() => (provider.value?.categories?.length || 0) > 0)
const canSave = computed(() => dirty.value && hasCategory.value)

onMounted(async () => {
  if (!auth.isLoggedIn) { router.push('/login'); return }
  try {
    const [pRes, cRes] = await Promise.all([
      auth.authFetch(`${API}/providers/me`),
      fetch(`${API}/categories`),
    ])
    if (!pRes.ok) { router.push('/'); return }
    provider.value = await pRes.json()
    categories.value = await cRes.json()
    original.value = snap()
  } finally {
    loading.value = false
  }
})

const avgStars = computed(() => {
  const avg = provider.value?.rating?.average || 0
  return Array.from({ length: 5 }, (_, i) => {
    const filled = i + 1 <= Math.floor(avg)
    const half = !filled && i < avg
    return { filled, half }
  })
})

const toggleCat = (name) => {
  const arr = provider.value.categories || (provider.value.categories = [])
  const i = arr.indexOf(name)
  if (i === -1) arr.push(name); else arr.splice(i, 1)
}

const save = async () => {
  saving.value = true; msg.value = ''
  try {
    const { businessName, description, city, postalCode, categories: cats, availability } = provider.value
    const res = await auth.authFetch(`${API}/providers/${provider.value._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, description, city, postalCode, categories: cats, availability }),
    })
    if (res.ok) { provider.value = await res.json(); original.value = snap(); msg.value = '✅ Guardado' }
    else msg.value = 'Error al guardar'
    setTimeout(() => (msg.value = ''), 2500)
  } finally { saving.value = false }
}

// ── Fotos (config tipo EmployeeRegisterView) ─────────────────────────────────
const profileFile = ref(null)
const profilePreview = ref(null)
const newPhotos = ref([])
const newPreviews = ref([])
const uploadingPhotos = ref(false)
const photoMsg = ref('')

const roomLeft = computed(() => Math.max(0, 5 - (provider.value?.photos?.length || 0) - newPhotos.value.length))

const onProfile = (e) => {
  const f = e.target.files[0] || null
  profileFile.value = f
  profilePreview.value = f ? URL.createObjectURL(f) : null
  e.target.value = ''
}
const onWorks = (e) => {
  const incoming = Array.from(e.target.files)
  const toAdd = incoming.slice(0, roomLeft.value)
  newPhotos.value = [...newPhotos.value, ...toAdd]
  newPreviews.value = [...newPreviews.value, ...toAdd.map((f) => URL.createObjectURL(f))]
  e.target.value = ''
}
const removeNew = (i) => { newPhotos.value.splice(i, 1); newPreviews.value.splice(i, 1) }

const savePhotos = async () => {
  uploadingPhotos.value = true; photoMsg.value = ''
  try {
    if (profileFile.value) {
      const fd = new FormData(); fd.append('photo', profileFile.value)
      const r = await auth.authFetch(`${API}/providers/${provider.value._id}/profile-photo`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error((await r.json()).message || 'Error con la foto de perfil')
      provider.value.profilePhoto = (await r.json()).profilePhoto
      profileFile.value = null; profilePreview.value = null
    }
    if (newPhotos.value.length) {
      const fd = new FormData(); newPhotos.value.forEach((f) => fd.append('photos', f))
      const r = await auth.authFetch(`${API}/providers/${provider.value._id}/photos`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error((await r.json()).message || 'Error al subir fotos')
      provider.value.photos = (await r.json()).photos
      newPhotos.value = []; newPreviews.value = []
    }
    photoMsg.value = '✅ Fotos actualizadas'
    setTimeout(() => (photoMsg.value = ''), 2500)
  } catch (e) { photoMsg.value = e.message || 'Error al subir' }
  finally { uploadingPhotos.value = false }
}

// QR que apunta al perfil público del proveedor en el cliente web
const profileQrUrl  = computed(() => provider.value ? `${API}/providers/${provider.value._id}/profile-qr` : '')
const profilePageUrl = computed(() => provider.value ? `${CLIENT_URL}/providers/${provider.value._id}` : '')

const downloadQr = async () => {
  if (!profileQrUrl.value) return
  const res  = await fetch(profileQrUrl.value)
  const blob = await res.blob()
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = `qr-${provider.value.businessName?.replace(/\s+/g, '-').toLowerCase() || provider.value._id}.png`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <!-- Lightbox -->
  <Teleport to="body">
    <div v-if="lightbox" @click="lightbox = null"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out">
      <img :src="lightbox" class="max-h-[90vh] max-w-full rounded-xl shadow-2xl object-contain" />
    </div>
  </Teleport>

  <main class="max-w-3xl mx-auto py-8 px-4 space-y-5">
    <div v-if="loading" class="flex items-center justify-center py-24 text-gray-400"><span class="animate-spin mr-2">⏳</span> Cargando...</div>

    <template v-else-if="provider">
      <!-- ── Tarjeta principal (tema ProviderDetail) ── -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="h-24 bg-gradient-to-br from-brand-green to-brand-dark relative">
          <div class="absolute -bottom-8 left-6">
            <div v-if="provider.profilePhoto?.url" class="w-16 h-16 rounded-full ring-4 ring-white overflow-hidden shadow">
              <img :src="provider.profilePhoto.url" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-16 h-16 rounded-full ring-4 ring-white bg-brand-green/20 flex items-center justify-center text-2xl font-bold text-white shadow">
              {{ provider.businessName?.[0] }}
            </div>
          </div>
          <span :class="provider.availability === 'available' ? 'bg-green-400' : 'bg-gray-400'"
            class="absolute top-3 right-4 text-white text-xs px-2.5 py-1 rounded-full font-medium">
            {{ provider.availability === 'available' ? '● Disponible' : provider.availability === 'busy' ? '● Ocupado' : '○ Inactivo' }}
          </span>
        </div>
        <div class="pt-12 px-6 pb-6">
          <h1 class="text-xl font-bold text-gray-900">{{ provider.businessName }}</h1>
          <p class="text-sm text-gray-500 mt-0.5">📍 {{ provider.city }}{{ provider.postalCode ? ` · CP ${provider.postalCode}` : '' }}</p>
          <div class="flex items-center gap-2 mt-3">
            <div class="flex gap-0.5">
              <span v-for="(s, i) in avgStars" :key="i" class="text-xl"
                :class="s.filled ? 'text-yellow-400' : s.half ? 'text-yellow-300' : 'text-gray-200'">★</span>
            </div>
            <span class="text-sm font-semibold text-gray-700">{{ provider.rating?.average || 0 }}</span>
            <span class="text-sm text-gray-400">({{ provider.rating?.count || 0 }} reseñas)</span>
          </div>
          <div v-if="provider.categories?.length" class="flex flex-wrap gap-2 mt-4">
            <span v-for="cat in provider.categories" :key="cat" class="bg-brand-green/10 text-brand-green text-xs px-3 py-1 rounded-full font-medium">{{ cat }}</span>
          </div>
        </div>
      </div>

      <!-- ── Editar datos ── -->
      <div class="bg-white rounded-2xl shadow-sm p-6 space-y-3">
        <h2 class="text-base font-bold text-gray-800 mb-1">Editar información</h2>
        <input v-model="provider.businessName" placeholder="Nombre del negocio"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
        <textarea v-model="provider.description" rows="3" placeholder="Descripción"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"></textarea>
        <div class="grid grid-cols-2 gap-3">
          <input v-model="provider.city" placeholder="Ciudad"
            class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          <input v-model="provider.postalCode" placeholder="Código postal"
            class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700 mb-2">Servicios</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="c in categories" :key="c._id" type="button" @click="toggleCat(c.name)"
              class="text-sm px-3 py-1.5 rounded-full border transition-colors"
              :class="provider.categories?.includes(c.name) ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-green'">
              {{ c.icon }} {{ c.name }}
            </button>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700 mb-1">Disponibilidad</p>
          <select v-model="provider.availability" class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green">
            <option value="available">Disponible</option>
            <option value="busy">Ocupado</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
        <p v-if="!hasCategory" class="text-xs text-amber-600">⚠️ Selecciona al menos un servicio para poder guardar.</p>
        <div class="flex items-center gap-3 pt-1">
          <button @click="save" :disabled="saving || !canSave"
            class="bg-brand-green text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <span class="text-sm text-gray-500">{{ msg }}</span>
        </div>
      </div>

      <!-- ── Fotos (config tipo EmployeeRegister) ── -->
      <div class="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <h2 class="text-base font-bold text-gray-800">Fotos</h2>

        <!-- Foto de perfil -->
        <div>
          <p class="text-sm font-semibold text-gray-700 mb-2">Foto de perfil <span class="text-gray-400 font-normal">(catálogo de WhatsApp)</span></p>
          <div class="flex items-center gap-4">
            <div class="shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <img v-if="profilePreview" :src="profilePreview" class="w-full h-full object-cover" />
              <img v-else-if="provider.profilePhoto?.url" :src="provider.profilePhoto.url" class="w-full h-full object-cover" />
              <span v-else class="text-3xl text-gray-300">👤</span>
            </div>
            <label class="flex-1 cursor-pointer">
              <div class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed transition-all duration-200"
                :class="profilePreview ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5'">
                <span>{{ profilePreview || provider.profilePhoto?.url ? '🔄' : '📷' }}</span>
                <span class="text-sm font-medium">{{ profilePreview ? 'Foto lista para guardar' : (provider.profilePhoto?.url ? 'Cambiar foto' : 'Seleccionar foto') }}</span>
              </div>
              <input type="file" accept="image/*" @change="onProfile" class="hidden" />
            </label>
          </div>
        </div>

        <!-- Fotos de trabajos -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-gray-700">Fotos de tus trabajos</p>
            <span class="text-xs text-gray-400">{{ (provider.photos?.length || 0) + newPhotos.length }}/5</span>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-2">
            <!-- Existentes (servidor) -->
            <div v-for="(ph, i) in provider.photos" :key="ph.publicId || i"
              @click="lightbox = ph.url"
              class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-zoom-in hover:opacity-90">
              <img :src="ph.url" class="w-full h-full object-cover" />
            </div>
            <!-- Nuevas (preview, sin subir) -->
            <div v-for="(src, i) in newPreviews" :key="'new' + i" class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 ring-brand-green/40">
              <img :src="src" class="w-full h-full object-cover" />
              <button type="button" @click="removeNew(i)"
                class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none">✕</button>
            </div>
            <!-- Slot agregar -->
            <label v-if="roomLeft > 0" class="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-green hover:bg-brand-green/5 transition-colors">
              <span class="text-2xl text-gray-300">+</span>
              <span class="text-xs text-gray-400 mt-1">Agregar</span>
              <input type="file" accept="image/*" multiple @change="onWorks" class="hidden" />
            </label>
          </div>
          <p class="text-xs text-gray-400">Máximo 5 fotos. Toca una existente para ampliarla.</p>
        </div>

        <div class="flex items-center gap-3">
          <button @click="savePhotos" :disabled="uploadingPhotos || (!profileFile && !newPhotos.length)"
            class="bg-brand-green text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50 transition-colors">
            {{ uploadingPhotos ? 'Subiendo...' : 'Guardar fotos' }}
          </button>
          <span class="text-sm text-gray-500">{{ photoMsg }}</span>
        </div>
      </div>

      <!-- ── QR de perfil ── -->
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="text-center mb-4">
          <h2 class="text-base font-bold text-gray-800">Tu código QR</h2>
          <p class="text-xs text-gray-500 mt-1">
            Compártelo o imprímelo — quien lo escanee verá tu perfil completo con reseñas y fotos.
          </p>
        </div>

        <!-- QR image -->
        <div class="flex justify-center mb-4">
          <div class="p-3 bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm inline-block">
            <img
              v-if="profileQrUrl"
              :src="profileQrUrl"
              alt="QR de perfil"
              class="w-44 h-44 rounded-lg"
            />
            <div v-else class="w-44 h-44 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 text-4xl">
              ▦
            </div>
          </div>
        </div>

        <!-- URL destino -->
        <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mb-4 max-w-sm mx-auto">
          <span class="text-gray-400 shrink-0">🔗</span>
          <p class="text-xs text-gray-500 truncate flex-1">{{ profilePageUrl }}</p>
          <button
            @click="navigator.clipboard.writeText(profilePageUrl)"
            class="text-brand-green text-xs font-medium hover:underline shrink-0"
            title="Copiar enlace"
          >Copiar</button>
        </div>

        <!-- Acciones -->
        <div class="flex gap-3 justify-center">
          <button
            @click="downloadQr"
            class="inline-flex items-center gap-2 bg-brand-green text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen transition-colors shadow-sm"
          >
            ⬇️ Descargar QR
          </button>
          <a
            :href="profilePageUrl"
            target="_blank"
            class="inline-flex items-center gap-2 border border-brand-green text-brand-green px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-green/5 transition-colors"
          >
            👁️ Ver perfil
          </a>
        </div>
      </div>
    </template>
  </main>
</template>
