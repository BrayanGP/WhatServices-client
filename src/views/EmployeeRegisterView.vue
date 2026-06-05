<script setup>
import { ref, onMounted, computed } from 'vue'
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
const geoLoading = ref(false)
const createdId = ref(null)
const photos = ref([])
const profilePhoto = ref(null)
const uploading = ref(false)
const done = ref(false)
const showPassword = ref(false)

// ── Ladas del mundo ──────────────────────────────────────────────────────────
const dialCodes = [
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+1',  flag: '🇺🇸', name: 'EUA / Canadá' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
  { code: '+33',  flag: '🇫🇷', name: 'Francia' },
  { code: '+49',  flag: '🇩🇪', name: 'Alemania' },
  { code: '+39',  flag: '🇮🇹', name: 'Italia' },
  { code: '+44',  flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+7',   flag: '🇷🇺', name: 'Rusia' },
  { code: '+81',  flag: '🇯🇵', name: 'Japón' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+82',  flag: '🇰🇷', name: 'Corea del Sur' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
]
const dialCode = ref('+52')

// ── Validaciones ─────────────────────────────────────────────────────────────
const touched = ref({})
const touch = (field) => { touched.value[field] = true }

const validators = {
  name:         v => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(v?.trim()) || 'Solo se permiten letras',
  businessName: v => v?.trim().length > 0 || 'Campo requerido',
  phone:        v => /^\d{7,10}$/.test(v?.trim()) || 'Solo números, entre 7 y 10 dígitos',
  email:        v => !v?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Correo inválido',
  password:     v => (v?.length >= 6) || 'Mínimo 6 caracteres',
  city:         v => v?.trim().length > 0 || 'Campo requerido',
  postalCode:   v => v?.trim().length > 0 || 'Campo requerido',
  description:  v => v?.trim().length > 0 || 'Campo requerido',
  address:      v => locMode.value === 'gps'
    ? (form.value.lat != null || 'Captura tu ubicación GPS')
    : (v?.trim().length > 0 || 'Escribe o selecciona una dirección'),
}

const fieldError = (field) => {
  if (!touched.value[field]) return ''
  const result = validators[field]?.(form.value[field])
  return result === true ? '' : result
}

const isFormValid = computed(() => {
  const required = ['name','businessName','phone','password','city','postalCode','description','address']
  return required.every(f => validators[f]?.(form.value[f]) === true)
    && (validators.email(form.value.email) === true)
})

// ── Filtro nombre: solo letras ────────────────────────────────────────────────
const onNameInput = () => {
  form.value.name = form.value.name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '')
}

// ── Filtro teléfono: solo dígitos, máx 10 ────────────────────────────────────
const onPhoneInput = () => {
  form.value.phone = form.value.phone.replace(/\D/g, '').slice(0, 10)
}

// ── Dropdown de categorías ────────────────────────────────────────────────────
const catDropdownOpen = ref(false)
const catSearch = ref('')
const filteredCategories = computed(() =>
  categories.value.filter(c => c.name.toLowerCase().includes(catSearch.value.toLowerCase()))
)
const toggleCatDropdown = () => {
  catDropdownOpen.value = !catDropdownOpen.value
  if (catDropdownOpen.value) catSearch.value = ''
}
const selectCat = (name) => {
  const i = form.value.categories.indexOf(name)
  if (i === -1) form.value.categories.push(name)
  else form.value.categories.splice(i, 1)
}
const removeCat = (name) => {
  form.value.categories = form.value.categories.filter(c => c !== name)
}

// ── Modal nueva categoría ─────────────────────────────────────────────────────
const showCatModal = ref(false)
const newCat = ref({ name: '', icon: '' })
const catLoading = ref(false)
const catError = ref('')

const suggestCategory = async () => {
  if (!newCat.value.name.trim()) return
  catLoading.value = true
  catError.value = ''
  try {
    const res = await fetch(`${API}/categories/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat.value.name.trim(), icon: newCat.value.icon.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al enviar')
    if (!form.value.categories.includes(newCat.value.name.trim())) {
      form.value.categories.push(newCat.value.name.trim())
    }
    showCatModal.value = false
    newCat.value = { name: '', icon: '' }
  } catch (e) {
    catError.value = e.message
  } finally {
    catLoading.value = false
  }
}

// ── Formulario ────────────────────────────────────────────────────────────────
const form = ref({
  name: '', email: '', phone: '', password: '',
  businessName: '', city: '', postalCode: '', address: '', description: '',
  categories: [], lat: null, lng: null,
})

onMounted(async () => {
  try {
    const res = await fetch(`${API}/categories`)
    categories.value = await res.json()
  } catch { /* ignore */ }
})

// ── Autocompletado dirección (Nominatim) ──────────────────────────────────────
const addressSuggestions = ref([])
const addressLoading = ref(false)
let addressDebounce = null

const onAddressInput = () => {
  clearTimeout(addressDebounce)
  addressSuggestions.value = []
  touch('address')
  if (form.value.address.length < 4) return
  addressDebounce = setTimeout(async () => {
    addressLoading.value = true
    try {
      const q = encodeURIComponent(form.value.address)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6&countrycodes=mx`,
        { headers: { 'Accept-Language': 'es' } }
      )
      addressSuggestions.value = (await res.json()).map(p => ({
        label: p.display_name,
        city: p.address?.city || p.address?.town || p.address?.village || p.address?.municipality || '',
        postalCode: p.address?.postcode || '',
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
      }))
    } catch { /* sin sugerencias */ }
    finally { addressLoading.value = false }
  }, 450)
}

const selectAddress = (s) => {
  form.value.address    = s.label
  form.value.city       = s.city       || form.value.city
  form.value.postalCode = s.postalCode || form.value.postalCode
  form.value.lat        = s.lat
  form.value.lng        = s.lng
  addressSuggestions.value = []
  geoStatus.value = 'captured'
  touch('address')
  touch('city')
  touch('postalCode')
}

// ── Modo de ubicación: 'address' | 'gps' ─────────────────────────────────────
const locMode = ref('address')

const setLocMode = (mode) => {
  locMode.value = mode
  // Limpiar el modo que se abandona
  if (mode === 'gps') {
    form.value.address = ''
    addressSuggestions.value = []
  } else {
    form.value.lat = null
    form.value.lng = null
    geoStatus.value = ''
  }
  touch('address')
}

// ── GPS ───────────────────────────────────────────────────────────────────────
const captureLocation = () => {
  if (!navigator.geolocation) { geoStatus.value = 'error'; return }
  geoLoading.value = true
  geoStatus.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.value.lat = pos.coords.latitude
      form.value.lng = pos.coords.longitude
      geoStatus.value = 'captured'
      geoLoading.value = false
    },
    () => { geoStatus.value = 'error'; geoLoading.value = false }
  )
}

// ── Submit ────────────────────────────────────────────────────────────────────
const submit = async () => {
  // Marcar todos como tocados para mostrar errores
  Object.keys(validators).forEach(f => { touched.value[f] = true })
  if (!isFormValid.value) return

  loading.value = true
  error.value = ''
  try {
    const payload = { ...form.value, phone: `${dialCode.value}${form.value.phone}` }
    const res = await fetch(`${API}/providers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al registrar')
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

const onFiles   = (e) => { photos.value = Array.from(e.target.files).slice(0, 5) }
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
      photos.value.forEach(f => fd.append('photos', f))
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

      <!-- ── Paso 1 ── -->
      <div v-if="step === 1" class="space-y-3">

        <!-- Nombre -->
        <div>
          <input
            v-model="form.name"
            placeholder="Tu nombre *"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            :class="fieldError('name') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
            @input="onNameInput"
            @blur="touch('name')"
          />
          <p v-if="fieldError('name')" class="text-xs text-red-500 mt-1">{{ fieldError('name') }}</p>
        </div>

        <!-- Negocio -->
        <div>
          <input
            v-model="form.businessName"
            placeholder="Nombre del negocio *"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            :class="fieldError('businessName') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
            @blur="touch('businessName')"
          />
          <p v-if="fieldError('businessName')" class="text-xs text-red-500 mt-1">{{ fieldError('businessName') }}</p>
        </div>

        <!-- Teléfono con lada -->
        <div>
          <div class="flex gap-2">
            <select
              v-model="dialCode"
              class="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white shrink-0 w-36"
            >
              <option v-for="d in dialCodes" :key="d.code" :value="d.code">
                {{ d.flag }} {{ d.code }}
              </option>
            </select>
            <input
              v-model="form.phone"
              placeholder="Teléfono *"
              inputmode="numeric"
              maxlength="10"
              class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              :class="fieldError('phone') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
              @input="onPhoneInput"
              @blur="touch('phone')"
            />
          </div>
          <p v-if="fieldError('phone')" class="text-xs text-red-500 mt-1">{{ fieldError('phone') }}</p>
        </div>

        <!-- Email -->
        <div>
          <input
            v-model="form.email"
            type="email"
            placeholder="Correo electrónico (opcional)"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            :class="fieldError('email') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
            @blur="touch('email')"
          />
          <p v-if="fieldError('email')" class="text-xs text-red-500 mt-1">{{ fieldError('email') }}</p>
        </div>

        <!-- Contraseña con toggle -->
        <div>
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Contraseña *"
              class="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
              :class="fieldError('password') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
              @blur="touch('password')"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              tabindex="-1"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="fieldError('password')" class="text-xs text-red-500 mt-1">{{ fieldError('password') }}</p>
        </div>

        <!-- Ciudad y CP -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <input
              v-model="form.city"
              placeholder="Ciudad *"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              :class="fieldError('city') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
              @blur="touch('city')"
            />
            <p v-if="fieldError('city')" class="text-xs text-red-500 mt-1">{{ fieldError('city') }}</p>
          </div>
          <div>
            <input
              v-model="form.postalCode"
              placeholder="Código postal *"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              :class="fieldError('postalCode') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
              @blur="touch('postalCode')"
            />
            <p v-if="fieldError('postalCode')" class="text-xs text-red-500 mt-1">{{ fieldError('postalCode') }}</p>
          </div>
        </div>

        <!-- Descripción -->
        <div>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Describe tus servicios y experiencia *"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            :class="fieldError('description') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
            @blur="touch('description')"
          ></textarea>
          <p v-if="fieldError('description')" class="text-xs text-red-500 mt-1">{{ fieldError('description') }}</p>
        </div>

        <!-- Categorías (opcional) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-700">¿Qué servicios ofreces?</p>
            <button type="button" @click="showCatModal = true"
              class="text-xs text-brand-green border border-brand-green px-2 py-1 rounded-full hover:bg-brand-green hover:text-white transition-colors"
            >+ Nueva categoría</button>
          </div>
          <div v-if="form.categories.length" class="flex flex-wrap gap-1 mb-2">
            <span v-for="cat in form.categories" :key="cat"
              class="inline-flex items-center gap-1 text-xs bg-brand-green text-white px-2 py-1 rounded-full"
            >{{ cat }}<button type="button" @click="removeCat(cat)" class="hover:opacity-70 leading-none">✕</button></span>
          </div>
          <div class="relative">
            <button type="button" @click="toggleCatDropdown"
              class="w-full border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
              :class="catDropdownOpen ? 'ring-2 ring-brand-green border-brand-green' : 'border-gray-300'"
            >
              <span :class="form.categories.length ? 'text-gray-700' : 'text-gray-400'">
                {{ form.categories.length ? `${form.categories.length} servicio(s) seleccionado(s)` : 'Selecciona tus servicios...' }}
              </span>
              <span class="text-gray-400 text-xs">{{ catDropdownOpen ? '▲' : '▼' }}</span>
            </button>
            <div v-if="catDropdownOpen"
              class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
            >
              <div class="p-2 border-b">
                <input v-model="catSearch" placeholder="Buscar categoría..."
                  class="w-full text-sm px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                  @click.stop />
              </div>
              <ul class="max-h-48 overflow-y-auto">
                <li v-if="!filteredCategories.length" class="px-4 py-3 text-sm text-gray-400 text-center">Sin resultados</li>
                <li v-for="c in filteredCategories" :key="c._id" @click="selectCat(c.name)"
                  class="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50"
                  :class="form.categories.includes(c.name) ? 'bg-brand-green/5' : ''"
                >
                  <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs"
                    :class="form.categories.includes(c.name) ? 'bg-brand-green border-brand-green text-white' : 'border-gray-300'"
                  >{{ form.categories.includes(c.name) ? '✓' : '' }}</span>
                  <span>{{ c.icon }} {{ c.name }}</span>
                </li>
              </ul>
              <div class="p-2 border-t">
                <button type="button" @click="catDropdownOpen = false"
                  class="w-full text-xs text-center text-gray-500 hover:text-gray-700 py-1">Cerrar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ubicación -->
        <div class="space-y-3">
          <p class="text-sm font-medium text-gray-700">Ubicación *</p>

          <!-- Switch de modo -->
          <div class="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              @click="setLocMode('address')"
              class="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              :class="locMode === 'address'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-gray-500 hover:text-gray-700'"
            >
              <span>✏️</span> Escribir dirección
            </button>
            <button
              type="button"
              @click="setLocMode('gps')"
              class="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              :class="locMode === 'gps'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-gray-500 hover:text-gray-700'"
            >
              <span>📍</span> Ubicación actual
            </button>
          </div>

          <!-- Panel: dirección manual -->
          <div v-if="locMode === 'address'" class="relative">
            <input
              v-model="form.address"
              placeholder="Escribe tu dirección (calle, colonia, ciudad)"
              class="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2"
              :class="fieldError('address') ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'"
              autocomplete="off"
              @input="onAddressInput"
              @blur="touch('address')"
            />
            <span v-if="addressLoading" class="absolute right-2.5 top-2.5 text-gray-400 text-xs animate-spin">⏳</span>
            <ul v-if="addressSuggestions.length"
              class="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto"
            >
              <li v-for="(s, i) in addressSuggestions" :key="i"
                @mousedown.prevent="selectAddress(s)"
                class="px-4 py-2.5 text-sm cursor-pointer hover:bg-brand-green/5 border-b border-gray-50 last:border-0"
              >
                <p class="text-gray-800 truncate">{{ s.label }}</p>
                <p v-if="s.city || s.postalCode" class="text-xs text-gray-400 mt-0.5">
                  {{ [s.city, s.postalCode].filter(Boolean).join(' · ') }}
                </p>
              </li>
            </ul>
            <p v-if="fieldError('address')" class="text-xs text-red-500 mt-1">{{ fieldError('address') }}</p>
          </div>

          <!-- Panel: GPS -->
          <div v-else class="space-y-2">
            <button
              type="button"
              @click="captureLocation"
              :disabled="geoLoading"
              class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200"
              :class="geoStatus === 'captured'
                ? 'border-brand-green bg-brand-green/5 text-brand-green'
                : geoStatus === 'error'
                  ? 'border-red-300 bg-red-50 text-red-500'
                  : 'border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5'"
            >
              <span v-if="geoLoading" class="animate-spin text-lg">⏳</span>
              <span v-else-if="geoStatus === 'captured'" class="text-lg">✅</span>
              <span v-else-if="geoStatus === 'error'" class="text-lg">⚠️</span>
              <span v-else class="text-lg">📍</span>
              <span>{{ geoLoading ? 'Obteniendo ubicación...'
                : geoStatus === 'captured' ? 'Ubicación capturada correctamente'
                : geoStatus === 'error' ? 'No se pudo obtener la ubicación — intenta de nuevo'
                : 'Toca para capturar tu ubicación actual' }}</span>
            </button>
            <p v-if="fieldError('address') && touched.address" class="text-xs text-red-500">{{ fieldError('address') }}</p>
          </div>
        </div>

        <button @click="submit" :disabled="loading"
          class="w-full bg-brand-green text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          :class="!loading ? 'hover:bg-brand-lightGreen' : ''"
        >
          {{ loading ? 'Registrando...' : 'Continuar' }}
        </button>
      </div>

      <!-- ── Paso 2 ── -->
      <div v-else-if="step === 2" class="space-y-4">
        <p class="text-sm text-gray-600">¡Cuenta creada! 🎉</p>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Foto de perfil</label>
          <input type="file" accept="image/*" @change="onProfile" class="w-full text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Fotos de tus trabajos (hasta 5)</label>
          <input type="file" accept="image/*" multiple @change="onFiles" class="w-full text-sm" />
        </div>
        <p v-if="photos.length" class="text-xs text-gray-500">{{ photos.length }} foto(s) seleccionada(s)</p>
        <div class="flex gap-2">
          <button @click="uploadPhotos" :disabled="uploading"
            class="flex-1 bg-brand-green text-white py-2.5 rounded-lg hover:bg-brand-lightGreen disabled:opacity-50 font-medium">
            {{ uploading ? 'Subiendo...' : 'Subir y finalizar' }}
          </button>
          <button @click="step = 3; done = true" class="text-sm text-gray-400 px-3">Omitir</button>
        </div>
      </div>

      <!-- ── Paso 3 ── -->
      <div v-else class="text-center py-6">
        <div class="text-4xl mb-3">🎉</div>
        <h2 class="text-lg font-semibold text-gray-800 mb-1">¡Listo, ya eres parte de WhatServices!</h2>
        <p class="text-sm text-gray-500 mb-4">Tu perfil ya puede aparecer en las búsquedas de clientes.</p>
        <button @click="router.push('/mi-perfil')" class="bg-brand-green text-white px-5 py-2.5 rounded-lg hover:bg-brand-lightGreen">
          Ver mi perfil
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: sugerir nueva categoría -->
  <Teleport to="body">
    <div v-if="showCatModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 class="text-lg font-bold text-gray-800 mb-1">Sugerir nueva categoría</h2>
        <p class="text-xs text-gray-500 mb-4">Se enviará al administrador. Se agregará a tu perfil de inmediato y será visible cuando sea aprobada.</p>
        <div v-if="catError" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-3">{{ catError }}</div>
        <div class="space-y-3">
          <input v-model="newCat.name" placeholder="Nombre (ej. Tapicero)"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            @keyup.enter="suggestCategory" />
          <input v-model="newCat.icon" placeholder="Emoji opcional (ej. 🛋️)"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          <div class="flex gap-2 pt-1">
            <button @click="suggestCategory" :disabled="catLoading || !newCat.name.trim()"
              class="flex-1 bg-brand-green text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50">
              {{ catLoading ? 'Enviando...' : 'Enviar y agregar' }}
            </button>
            <button @click="showCatModal = false; catError = ''; newCat = { name: '', icon: '' }"
              class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
