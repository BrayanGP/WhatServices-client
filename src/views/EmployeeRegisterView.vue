<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { track } from '../lib/analytics'
import miLogo from '../assets/logoWhatServices.png'

const API = import.meta.env.VITE_API_URL || '/api'
const router = useRouter()
const auth = useAuthStore()

const step = ref('otp') // 'otp' → 1 → 2 → 3
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

// ── Verificación por OTP (paso 0) ─────────────────────────────────────────────
const otpName = ref('')
const otpDial = ref('+52')
const otpPhone = ref('')
const otpCode = ref('')
// OTP por WhatsApp: desactivado por defecto hasta aprobar el template en Meta.
// Para activarlo cuando esté aprobado: VITE_OTP_ENABLED=true (debe coincidir con OTP_ENABLED del backend).
const OTP_ENABLED = import.meta.env.VITE_OTP_ENABLED === 'true'
const otpSent = ref(false)
const otpLoading = ref(false)
const otpError = ref('')
const otpAttemptsLeft = ref(null)
const blockedUntil = ref(0)
const nowTs = ref(Date.now())
let blockTimer = null
const BLOCK_KEY = 'ws_reg_block'

const blockRemaining = computed(() => Math.max(0, blockedUntil.value - nowTs.value))
const isBlocked = computed(() => blockRemaining.value > 0)
const blockMmss = computed(() => {
  const s = Math.ceil(blockRemaining.value / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})
const tickBlock = () => {
  clearInterval(blockTimer)
  blockTimer = setInterval(() => { nowTs.value = Date.now(); if (!isBlocked.value) clearInterval(blockTimer) }, 1000)
}
const startBlock = (ms, phoneKey) => {
  blockedUntil.value = Date.now() + (ms || 10 * 60 * 1000)
  localStorage.setItem(BLOCK_KEY, JSON.stringify({ phone: phoneKey, until: blockedUntil.value }))
  tickBlock()
}
// Temporizador de vigencia del código (5 min) — el reenvío se habilita al expirar
const otpExpiresAt = ref(0)
let codeTimer = null
const codeRemaining = computed(() => Math.max(0, otpExpiresAt.value - nowTs.value))
const codeMmss = computed(() => {
  const s = Math.ceil(codeRemaining.value / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})
const codeExpired = computed(() => otpSent.value && otpExpiresAt.value > 0 && codeRemaining.value <= 0)
const startCodeTimer = (ms) => {
  otpExpiresAt.value = Date.now() + (ms || 5 * 60 * 1000)
  nowTs.value = Date.now()
  clearInterval(codeTimer)
  codeTimer = setInterval(() => { nowTs.value = Date.now(); if (codeRemaining.value <= 0) clearInterval(codeTimer) }, 1000)
}

const onOtpName = () => { otpName.value = otpName.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '') }
const onOtpPhone = () => { otpPhone.value = otpPhone.value.replace(/\D/g, '').slice(0, 10) }

const sendOtp = async () => {
  otpError.value = ''
  if (!otpName.value.trim()) { otpError.value = 'Escribe tu nombre'; return }
  if (otpPhone.value.length < 10) { otpError.value = 'Teléfono de 10 dígitos'; return }
  if (isBlocked.value) return
  otpLoading.value = true
  try {
    const res = await fetch(`${API}/auth/register/send-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `${otpDial.value}${otpPhone.value}` }),
    })
    const data = await res.json()
    if (res.status === 429) { startBlock(data.remainingMs, otpPhone.value); throw new Error(data.message || 'Bloqueado') }
    if (!res.ok) throw new Error(data.message || 'Error al enviar el código')
    // OTP desactivado temporalmente en el backend → continuar sin código.
    if (data.otpDisabled) {
      form.value.name = otpName.value
      form.value.phone = otpPhone.value
      dialCode.value = otpDial.value
      localStorage.removeItem(BLOCK_KEY)
      step.value = 1
      return
    }
    otpSent.value = true; otpAttemptsLeft.value = null; otpCode.value = ''
    startCodeTimer(data.expiresInMs)
  } catch (e) { otpError.value = e.message } finally { otpLoading.value = false }
}

const verifyOtp = async () => {
  otpError.value = ''
  if (isBlocked.value) return
  if (otpCode.value.trim().length < 4) { otpError.value = 'Ingresa el código'; return }
  otpLoading.value = true
  try {
    const res = await fetch(`${API}/auth/register/verify-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `${otpDial.value}${otpPhone.value}`, code: otpCode.value.trim() }),
    })
    const data = await res.json()
    if (res.status === 429) { startBlock(data.remainingMs, otpPhone.value); throw new Error(data.message || 'Bloqueado 10 minutos') }
    if (!res.ok) { otpAttemptsLeft.value = data.attemptsLeft ?? null; throw new Error(data.message || 'Código incorrecto') }
    // Verificado → pasar al resto del formulario con datos precargados
    form.value.name = otpName.value
    form.value.phone = otpPhone.value
    dialCode.value = otpDial.value
    localStorage.removeItem(BLOCK_KEY)
    clearInterval(codeTimer)
    track('otp_verified')
    step.value = 1
  } catch (e) { otpError.value = e.message } finally { otpLoading.value = false }
}

onUnmounted(() => { clearInterval(blockTimer); clearInterval(codeTimer) })

// ── Validaciones ─────────────────────────────────────────────────────────────
const touched = ref({})
const touch = (field) => { touched.value[field] = true }

const validators = {
  name:         v => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(v?.trim()) || 'Solo se permiten letras',
  businessName: v => v?.trim().length > 0 || 'Campo requerido',
  phone:        v => /^\d{7,10}$/.test(v?.trim()) || 'Solo números, entre 7 y 10 dígitos',
  password:     v => (v?.length >= 6) || 'Mínimo 6 caracteres',
  city:         v => v?.trim().length > 0 || 'Campo requerido',
  postalCode:   v => v?.trim().length > 0 || 'Campo requerido',
  description:  v => v?.trim().length > 0 || 'Campo requerido',
}

const fieldError = (field) => {
  if (!touched.value[field]) return ''
  const result = validators[field]?.(form.value[field])
  return result === true ? '' : result
}

const isFormValid = computed(() => {
  const required = ['name', 'businessName', 'phone', 'password', 'city', 'postalCode', 'description']
  return required.every(f => validators[f]?.(form.value[f]) === true)
    && form.value.categories.length > 0
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

// ── Documentos legales y aceptación ──────────────────────────────────────────
const acceptedLegal = ref(false)        // checkbox obligatorio de Términos + Privacidad
const legalTouched = ref(false)
const legal = ref({
  terms:   { url: import.meta.env.VITE_TERMS_URL   || '', version: '1.0' },
  privacy: { url: import.meta.env.VITE_PRIVACY_URL || '', version: '1.0' },
})
const PUBLIC_BACKEND = import.meta.env.VITE_PUBLIC_BACKEND_URL || ''
// Enlaces de descarga, con respaldo a la ruta del backend que entrega el PDF como adjunto.
const termsHref = computed(() => legal.value.terms.url || (PUBLIC_BACKEND ? `${PUBLIC_BACKEND}/legal/download/terms` : '#'))
const privacyHref = computed(() => legal.value.privacy.url || (PUBLIC_BACKEND ? `${PUBLIC_BACKEND}/legal/download/privacy` : '#'))
// Toma las URLs de descarga y versiones del backend (GET /legal/docs); si falla, usa las de .env.
const loadLegalDocs = async () => {
  try {
    const res = await fetch(`${API}/legal/docs`)
    if (!res.ok) return
    const data = await res.json()
    if (data?.terms?.url)   legal.value.terms   = data.terms
    if (data?.privacy?.url) legal.value.privacy = data.privacy
  } catch { /* se conservan los valores de .env */ }
}

onMounted(async () => {
  track('unete_view')
  loadLegalDocs()
  try {
    const res = await fetch(`${API}/categories`)
    categories.value = await res.json()
  } catch { /* ignore */ }
  // Restaurar bloqueo de OTP si la página se recargó dentro de los 10 min
  try {
    const raw = localStorage.getItem(BLOCK_KEY)
    if (raw) {
      const { phone, until } = JSON.parse(raw)
      if (until > Date.now()) { otpPhone.value = phone || ''; blockedUntil.value = until; tickBlock() }
      else localStorage.removeItem(BLOCK_KEY)
    }
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
      // Geocodificación vía backend (evita bloqueos/CORS de Nominatim desde el navegador).
      const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(form.value.address)}`)
      const data = await res.json()
      addressSuggestions.value = Array.isArray(data) ? data : []
    } catch { addressSuggestions.value = [] }
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

// ── Regresar al paso OTP ─────────────────────────────────────────────────────
const goBackToOtp = () => {
  otpSent.value = false
  otpCode.value = ''
  otpError.value = ''
  form.value.name = ''
  form.value.phone = ''
  step.value = 'otp'
}

// ── Submit ────────────────────────────────────────────────────────────────────
const submit = async () => {
  // Marcar todos como tocados para mostrar errores
  Object.keys(validators).forEach(f => { touched.value[f] = true })
  touched.value.categories = true
  legalTouched.value = true
  if (!isFormValid.value) return
  // Debe aceptar Términos y Aviso de Privacidad antes de registrarse.
  if (!acceptedLegal.value) {
    error.value = 'Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const payload = {
      ...form.value,
      phone: `${dialCode.value}${form.value.phone}`,
      acceptedTerms: true, termsVersion: legal.value.terms.version || '1.0',
      acceptedPrivacy: true, privacyVersion: legal.value.privacy.version || '1.0',
    }
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
    track('register_success', { id: data.provider._id })
    step.value = 2
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Previews
const profilePreview = ref(null)
const photoPreviews  = ref([])

const onProfile = (e) => {
  const file = e.target.files[0] || null
  profilePhoto.value = file
  profilePreview.value = file ? URL.createObjectURL(file) : null
}

const onFiles = (e) => {
  const incoming = Array.from(e.target.files)
  const room = Math.max(0, 5 - photos.value.length)
  const toAdd = incoming.slice(0, room)
  photos.value = [...photos.value, ...toAdd]
  photoPreviews.value = [...photoPreviews.value, ...toAdd.map(f => URL.createObjectURL(f))]
  e.target.value = '' // permite volver a seleccionar (incluso el mismo archivo)
}

const removeWorkPhoto = (i) => {
  photos.value = photos.value.filter((_, idx) => idx !== i)
  photoPreviews.value = photoPreviews.value.filter((_, idx) => idx !== i)
}

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

      <!-- ── Paso 0: verificación por OTP ── -->
      <div v-if="step === 'otp'" class="space-y-3">
        <p v-if="OTP_ENABLED" class="text-sm text-gray-600 -mt-2">Primero verifica tu teléfono. Te enviaremos un código por WhatsApp. 📲</p>
        <p v-else class="text-sm text-gray-600 -mt-2">Ingresa tu nombre y teléfono para continuar con tu registro. 🧰</p>

        <input v-model="otpName" @input="onOtpName" placeholder="Tu nombre *" :disabled="otpSent || isBlocked"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:bg-gray-100" />

        <div class="flex gap-2 items-center w-full">
          <select v-model="otpDial" :disabled="otpSent || isBlocked"
            class="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white shrink-0 w-32 box-border focus:outline-none focus:ring-2 focus:ring-brand-green disabled:bg-gray-100">
            <option v-for="d in dialCodes" :key="d.code" :value="d.code">{{ d.flag }} {{ d.code }}</option>
          </select>
          <input v-model="otpPhone" @input="onOtpPhone" inputmode="numeric" maxlength="10" placeholder="Teléfono *" :disabled="otpSent || isBlocked"
            class="flex-1 w-full min-w-0 box-border border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:bg-gray-100" />
        </div>

        <div v-if="otpError" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded">{{ otpError }}</div>

        <div v-if="isBlocked" class="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-2 rounded">
          🚫 Demasiados intentos. Vuelve a intentar en <b>{{ blockMmss }}</b>.
        </div>

        <template v-else>
          <button v-if="!otpSent" @click="sendOtp" :disabled="otpLoading"
            class="w-full bg-brand-green text-white py-2.5 rounded-lg font-medium text-sm hover:bg-brand-lightGreen disabled:opacity-50">
            {{ otpLoading ? (OTP_ENABLED ? 'Enviando...' : 'Continuando...') : (OTP_ENABLED ? 'Enviar código' : 'Continuar →') }}
          </button>

          <template v-else>
            <input v-model="otpCode" inputmode="numeric" maxlength="6" placeholder="Código de 6 dígitos" @keyup.enter="verifyOtp"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-green" />
            <div class="flex items-center justify-between text-xs">
              <span v-if="!codeExpired" class="text-gray-500">Código válido por <span class="font-mono font-semibold text-brand-medium">{{ codeMmss }}</span></span>
              <span v-else class="text-red-500">El código expiró. Reenvíalo.</span>
              <span v-if="otpAttemptsLeft != null" class="text-amber-600">Intentos restantes: {{ otpAttemptsLeft }}</span>
            </div>
            <div class="flex gap-2">
              <button @click="verifyOtp" :disabled="otpLoading || codeExpired"
                class="flex-1 bg-brand-green text-white py-2.5 rounded-lg font-medium text-sm hover:bg-brand-lightGreen disabled:opacity-50 disabled:cursor-not-allowed">
                {{ otpLoading ? 'Verificando...' : 'Verificar y continuar' }}
              </button>
              <button @click="sendOtp" :disabled="otpLoading || !codeExpired"
                class="px-3 py-2.5 text-sm rounded-lg"
                :class="(!codeExpired || otpLoading) ? 'text-gray-300 cursor-not-allowed' : 'text-brand-green hover:underline font-medium'">Reenviar</button>
            </div>
          </template>
        </template>
      </div>

      <!-- ── Paso 1 ── -->
      <div v-else-if="step === 1" class="space-y-3">

        <!-- Botón regresar al paso OTP -->
        <button type="button" @click="goBackToOtp"
          class="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-green transition-colors -mt-1 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Editar nombre y teléfono
        </button>

        <!-- Nombre (pre-llenado desde OTP, no editable) -->
        <div class="flex items-center gap-2 border border-green-300 bg-green-50 rounded-lg px-3 py-2 text-sm">
          <span class="text-green-600">✓</span>
          <span class="text-gray-700">{{ form.name }}</span>
          <span class="text-xs text-green-600 ml-auto">Nombre verificado</span>
        </div>

         <!-- Teléfono verificado (no editable) -->
        <div class="flex items-center gap-2 border border-green-300 bg-green-50 rounded-lg px-3 py-2 text-sm">
          <span class="text-green-600">✓</span>
          <span class="text-gray-700">{{ dialCode }} {{ form.phone }}</span>
          <span class="text-xs text-green-600 ml-auto">Teléfono verificado</span>
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

        <!-- Categorías (obligatorio) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-700">¿Qué servicios ofreces? *</p>
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
          <p v-if="touched.categories && !form.categories.length" class="text-xs text-red-500 mt-1">
            Selecciona o crea al menos una categoría.
          </p>
        </div>

        <!-- Ubicación -->
        <!-- <div class="space-y-3">
          <p class="text-sm font-medium text-gray-700">Ubicación *</p>

      
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
       -->

        <!-- Aceptación obligatoria de Términos y Aviso de Privacidad -->
        <div class="pt-1">
          <label class="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" v-model="acceptedLegal" @change="legalTouched = true"
              class="mt-0.5 h-4 w-4 shrink-0 accent-brand-green cursor-pointer" />
            <span>
              Acepto los
              <a :href="termsHref" target="_blank" rel="noopener" download
                class="text-[#2563eb] underline hover:text-blue-800 font-medium">Términos y Condiciones</a>
              y el
              <a :href="privacyHref" target="_blank" rel="noopener" download
                class="text-[#2563eb] underline hover:text-blue-800 font-medium">Aviso de Privacidad</a>.
            </span>
          </label>
          <p v-if="legalTouched && !acceptedLegal" class="text-xs text-red-500 mt-1">
            Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.
          </p>
        </div>

        <button @click="submit" :disabled="loading || !acceptedLegal"
          class="w-full bg-brand-green text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="(!loading && acceptedLegal) ? 'hover:bg-brand-lightGreen' : ''"
        >
          {{ loading ? 'Registrando...' : 'Continuar' }}
        </button>
      </div>

      <!-- ── Paso 2 ── -->
      <div v-else-if="step === 2" class="space-y-5">
        <div class="text-center">
          <p class="text-lg font-bold text-brand-dark">¡Cuenta creada! 🎉</p>
          <p class="text-sm text-gray-500 mt-1">Agrega fotos para que los clientes confíen más en ti.</p>
        </div>

        <!-- Foto de perfil -->
        <div>
          <p class="text-sm font-semibold text-gray-700 mb-2">Foto de perfil</p>
          <div class="flex items-center gap-4">
            <!-- Preview -->
            <div class="shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <img v-if="profilePreview" :src="profilePreview" class="w-full h-full object-cover" />
              <span v-else class="text-3xl text-gray-300">👤</span>
            </div>
            <!-- Botón -->
            <label class="flex-1 cursor-pointer">
              <div class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed transition-all duration-200"
                :class="profilePreview
                  ? 'border-brand-green bg-brand-green/5 text-brand-green'
                  : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5'"
              >
                <span>{{ profilePreview ? '🔄' : '📷' }}</span>
                <span class="text-sm font-medium">{{ profilePreview ? 'Cambiar foto' : 'Seleccionar foto' }}</span>
              </div>
              <input type="file" accept="image/*" @change="onProfile" class="hidden" />
            </label>
          </div>
        </div>

        <!-- Fotos de trabajos -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-gray-700">Fotos de tus trabajos</p>
            <span class="text-xs text-gray-400">{{ photos.length }}/5</span>
          </div>

          <!-- Previews de trabajos -->
          <div v-if="photoPreviews.length" class="grid grid-cols-3 gap-2 mb-3">
            <div
              v-for="(src, i) in photoPreviews" :key="i"
              class="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
            >
              <img :src="src" class="w-full h-full object-cover" />
              <button
                type="button"
                @click="removeWorkPhoto(i)"
                class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none"
              >✕</button>
            </div>
            <!-- Slot para agregar más (si hay menos de 5) -->
            <label v-if="photos.length < 5" class="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-green hover:bg-brand-green/5 transition-colors">
              <span class="text-2xl text-gray-300">+</span>
              <span class="text-xs text-gray-400 mt-1">Agregar</span>
              <input type="file" accept="image/*" multiple @change="onFiles" class="hidden" />
            </label>
          </div>

          <!-- Botón inicial (sin fotos aún) -->
          <label v-else class="cursor-pointer block">
            <div class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all">
              <span>🖼️</span>
              <span class="text-sm font-medium">Seleccionar fotos (hasta 5)</span>
            </div>
            <input type="file" accept="image/*" multiple @change="onFiles" class="hidden" />
          </label>
        </div>

        <!-- Botones de acción -->
        <div class="flex gap-3 pt-1">
          <button
            @click="step = 3; done = true"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-brand-green hover:border-brand-green transition-colors font-medium"
          >Omitir</button>
          <button
            @click="uploadPhotos"
            :disabled="uploading"
            class="flex-1 bg-brand-green text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60"
            :class="!uploading ? 'hover:bg-brand-lightGreen' : ''"
          >
            <span v-if="uploading" class="flex items-center justify-center gap-2">
              <span class="animate-spin">⏳</span> Subiendo...
            </span>
            <span v-else>Subir fotos</span>
          </button>
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
