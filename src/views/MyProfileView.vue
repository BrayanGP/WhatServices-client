<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const API = import.meta.env.VITE_API_URL || '/api'
const PUBLIC_BACKEND = import.meta.env.VITE_PUBLIC_BACKEND_URL || ''
const router = useRouter()
const auth = useAuthStore()

const provider = ref(null)
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const msg = ref('')

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
  } finally {
    loading.value = false
  }
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
    if (res.ok) { provider.value = await res.json(); msg.value = '✅ Guardado' }
    else msg.value = 'Error al guardar'
  } finally { saving.value = false }
}

const uploadProfile = async (e) => {
  const f = e.target.files[0]; if (!f) return
  const fd = new FormData(); fd.append('photo', f)
  const res = await auth.authFetch(`${API}/providers/${provider.value._id}/profile-photo`, { method: 'POST', body: fd })
  if (res.ok) provider.value.profilePhoto = (await res.json()).profilePhoto
}

const uploadWorks = async (e) => {
  const files = Array.from(e.target.files).slice(0, 5); if (!files.length) return
  const fd = new FormData(); files.forEach((f) => fd.append('photos', f))
  const res = await auth.authFetch(`${API}/providers/${provider.value._id}/photos`, { method: 'POST', body: fd })
  if (res.ok) provider.value.photos = (await res.json()).photos
}

const rateQrUrl = () => `${PUBLIC_BACKEND}/wa/rate/${provider.value._id}/qr`
</script>

<template>
  <main class="max-w-2xl mx-auto py-8 px-4">
    <div v-if="loading" class="text-center text-gray-400 py-16">Cargando...</div>
    <template v-else-if="provider">
      <h1 class="text-2xl font-bold text-brand-dark mb-6">Mi perfil</h1>

      <!-- Foto de perfil -->
      <div class="bg-white rounded-xl shadow p-5 mb-4 flex items-center gap-4">
        <img v-if="provider.profilePhoto?.url" :src="provider.profilePhoto.url" class="w-20 h-20 rounded-full object-cover" />
        <div v-else class="w-20 h-20 rounded-full bg-brand-base/20 flex items-center justify-center text-2xl font-bold text-brand-medium">
          {{ provider.businessName?.[0] }}
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700 mb-1">Foto de perfil (catálogo WhatsApp)</p>
          <input type="file" accept="image/*" @change="uploadProfile" class="text-sm" />
        </div>
      </div>

      <!-- Datos -->
      <div class="bg-white rounded-xl shadow p-5 mb-4 space-y-3">
        <input v-model="provider.businessName" placeholder="Nombre del negocio" class="w-full border rounded-lg px-3 py-2" />
        <textarea v-model="provider.description" rows="3" placeholder="Descripción" class="w-full border rounded-lg px-3 py-2"></textarea>
        <div class="grid grid-cols-2 gap-3">
          <input v-model="provider.city" placeholder="Ciudad" class="border rounded-lg px-3 py-2" />
          <input v-model="provider.postalCode" placeholder="Código postal" class="border rounded-lg px-3 py-2" />
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700 mb-2">Servicios</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="c in categories" :key="c._id" type="button" @click="toggleCat(c.name)"
              class="text-sm px-3 py-1.5 rounded-full border"
              :class="provider.categories?.includes(c.name) ? 'bg-brand-base text-white border-brand-base' : 'bg-white text-gray-600 border-gray-300'">
              {{ c.icon }} {{ c.name }}
            </button>
          </div>
        </div>
        <select v-model="provider.availability" class="border rounded-lg px-3 py-2 text-sm">
          <option value="available">Disponible</option>
          <option value="busy">Ocupado</option>
          <option value="inactive">Inactivo</option>
        </select>
        <div class="flex items-center gap-3">
          <button @click="save" :disabled="saving" class="bg-brand-base text-white px-5 py-2 rounded-lg hover:bg-brand-light disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <span class="text-sm text-gray-500">{{ msg }}</span>
        </div>
      </div>

      <!-- Galeria de trabajos -->
      <div class="bg-white rounded-xl shadow p-5 mb-4">
        <p class="text-sm font-medium text-gray-700 mb-2">Fotos de trabajos</p>
        <div class="grid grid-cols-3 gap-2 mb-3">
          <img v-for="ph in provider.photos" :key="ph.publicId" :src="ph.url" class="rounded-lg h-24 w-full object-cover" />
        </div>
        <input type="file" accept="image/*" multiple @change="uploadWorks" class="text-sm" />
      </div>

      <!-- QR de calificacion -->
      <div class="bg-white rounded-xl shadow p-5 text-center">
        <p class="text-sm font-medium text-gray-700 mb-1">Tu QR de calificación</p>
        <p class="text-xs text-gray-500 mb-3">Muéstralo al terminar un trabajo: el cliente lo escanea y te califica por WhatsApp.</p>
        <img v-if="PUBLIC_BACKEND" :src="rateQrUrl()" alt="QR calificación" class="w-48 h-48 mx-auto" />
        <p v-else class="text-xs text-amber-600">Configura VITE_PUBLIC_BACKEND_URL para ver el QR.</p>
        <a v-if="PUBLIC_BACKEND" :href="rateQrUrl()" download class="inline-block mt-2 text-brand-light text-sm hover:underline">Descargar QR</a>
      </div>
    </template>
  </main>
</template>
