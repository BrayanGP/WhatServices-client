<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import miLogo from '../assets/logoWhatServices.png'

const API = import.meta.env.VITE_API_URL || '/api'
const router = useRouter()
const auth = useAuthStore()

const step = ref(1)
const categories = ref([])
const error = ref('')
const loading = ref(false)
const geoStatus = ref('')
const createdId = ref(null)
const photos = ref([])
const profilePhoto = ref(null)
const uploading = ref(false)
const done = ref(false)

const form = ref({
  name: '', email: '', phone: '', password: '',
  businessName: '', city: '', postalCode: '', description: '',
  categories: [], lat: null, lng: null,
})

onMounted(async () => {
  try {
    const res = await fetch(`${API}/categories`)
    categories.value = await res.json()
  } catch { /* ignore */ }
})

const toggleCat = (name) => {
  const i = form.value.categories.indexOf(name)
  if (i === -1) form.value.categories.push(name)
  else form.value.categories.splice(i, 1)
}

const captureLocation = () => {
  geoStatus.value = 'Obteniendo ubicación...'
  if (!navigator.geolocation) { geoStatus.value = 'Tu dispositivo no soporta geolocalización.'; return }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.value.lat = pos.coords.latitude
      form.value.lng = pos.coords.longitude
      geoStatus.value = '✅ Ubicación capturada'
    },
    () => { geoStatus.value = '⚠️ No se pudo obtener tu ubicación (puedes continuar sin ella).' }
  )
}

const submit = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/providers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form.value),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al registrar')
    // persistir sesión para poder subir fotos
    auth.accessToken = data.accessToken
    auth.user = data.user
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    createdId.value = data.provider._id
    step.value = 2
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const onFiles = (e) => { photos.value = Array.from(e.target.files).slice(0, 5) }
const onProfile = (e) => { profilePhoto.value = e.target.files[0] || null }

const uploadPhotos = async () => {
  uploading.value = true
  error.value = ''
  try {
    if (profilePhoto.value) {
      const fdp = new FormData()
      fdp.append('photo', profilePhoto.value)
      await auth.authFetch(`${API}/providers/${createdId.value}/profile-photo`, { method: 'POST', body: fdp })
    }
    if (photos.value.length) {
      const fd = new FormData()
      photos.value.forEach((f) => fd.append('photos', f))
      const res = await auth.authFetch(`${API}/providers/${createdId.value}/photos`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).message || 'Error al subir fotos')
    }
    done.value = true
    step.value = 3
  } catch (e) {
    error.value = e.message
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="bg-gradient-to-br from-brand-green to-brand-dark py-10 px-4 min-h-[80vh]">
    <div class="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-6">
      <div class="flex flex-col items-center mb-6">
        <img :src="miLogo" alt="WhatServices" class="h-12 w-auto object-contain mb-2" />
        <h1 class="text-2xl font-bold text-brand-dark">Únete como profesional</h1>
        <p class="text-sm text-gray-500">Regístrate y empieza a recibir clientes de WhatServices.</p>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-4">{{ error }}</div>

      <!-- Paso 1: datos -->
      <div v-if="step === 1" class="space-y-3">
        <input v-model="form.name" placeholder="Tu nombre" class="w-full border rounded-lg px-3 py-2" />
        <input v-model="form.businessName" placeholder="Nombre del negocio / como te anuncias" class="w-full border rounded-lg px-3 py-2" />
        <input v-model="form.phone" placeholder="Teléfono / WhatsApp" class="w-full border rounded-lg px-3 py-2" />
        <input v-model="form.email" type="email" placeholder="Correo (opcional)" class="w-full border rounded-lg px-3 py-2" />
        <input v-model="form.password" type="password" placeholder="Contraseña (mín. 6)" class="w-full border rounded-lg px-3 py-2" />
        <div class="grid grid-cols-2 gap-3">
          <input v-model="form.city" placeholder="Ciudad" class="border rounded-lg px-3 py-2" />
          <input v-model="form.postalCode" placeholder="Código postal" class="border rounded-lg px-3 py-2" />
        </div>
        <textarea v-model="form.description" rows="3" placeholder="Describe tus servicios y experiencia" class="w-full border rounded-lg px-3 py-2"></textarea>

        <div>
          <p class="text-sm font-medium text-gray-700 mb-2">¿Qué servicios ofreces?</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in categories" :key="c._id" type="button" @click="toggleCat(c.name)"
              class="text-sm px-3 py-1.5 rounded-full border"
              :class="form.categories.includes(c.name) ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300'"
            >{{ c.icon }} {{ c.name }}</button>
          </div>
        </div>

        <div>
          <button type="button" @click="captureLocation" class="text-sm bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">📍 Usar mi ubicación</button>
          <span class="text-xs text-gray-500 ml-2">{{ geoStatus }}</span>
        </div>

        <button @click="submit" :disabled="loading" class="w-full bg-brand-green text-white py-2.5 rounded-lg hover:bg-brand-lightGreen disabled:opacity-50 font-medium">
          {{ loading ? 'Registrando...' : 'Continuar' }}
        </button>
      </div>

      <!-- Paso 2: fotos -->
      <div v-else-if="step === 2" class="space-y-4">
        <p class="text-sm text-gray-600">¡Cuenta creada! 🎉</p>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Foto de perfil (se muestra en el catálogo de WhatsApp)</label>
          <input type="file" accept="image/*" @change="onProfile" class="w-full text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Fotos de tus trabajos (hasta 5)</label>
          <input type="file" accept="image/*" multiple @change="onFiles" class="w-full text-sm" />
        </div>
        <p v-if="photos.length" class="text-xs text-gray-500">{{ photos.length }} foto(s) seleccionada(s)</p>
        <div class="flex gap-2">
          <button @click="uploadPhotos" :disabled="uploading" class="flex-1 bg-brand-green text-white py-2.5 rounded-lg hover:bg-brand-lightGreen disabled:opacity-50 font-medium">
            {{ uploading ? 'Subiendo...' : 'Subir y finalizar' }}
          </button>
          <button @click="step = 3; done = true" class="text-sm text-gray-400 px-3">Omitir</button>
        </div>
      </div>

      <!-- Paso 3: listo -->
      <div v-else class="text-center py-6">
        <div class="text-4xl mb-3">🎉</div>
        <h2 class="text-lg font-semibold text-gray-800 mb-1">¡Listo, ya eres parte de WhatServices!</h2>
        <p class="text-sm text-gray-500 mb-4">Tu perfil ya puede aparecer en las búsquedas de clientes.</p>
        <button @click="router.push('/mi-perfil')" class="bg-brand-green text-white px-5 py-2.5 rounded-lg hover:bg-brand-lightGreen">Ver mi perfil</button>
      </div>
    </div>
  </div>
</template>
