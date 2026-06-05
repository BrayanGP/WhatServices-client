<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import miLogo from '../assets/logoWhatServices.png'

const API = import.meta.env.VITE_API_URL || '/api'
const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const submit = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Olvidé mi contraseña ──────────────────────────────────────────────────────
const dialCodes = [
  { code: '+52', flag: '🇲🇽' }, { code: '+1', flag: '🇺🇸' }, { code: '+54', flag: '🇦🇷' },
  { code: '+57', flag: '🇨🇴' }, { code: '+56', flag: '🇨🇱' }, { code: '+51', flag: '🇵🇪' },
  { code: '+593', flag: '🇪🇨' }, { code: '+502', flag: '🇬🇹' }, { code: '+34', flag: '🇪🇸' },
]

const showReset = ref(false)
const resetStep = ref('phone') // phone | code | done
const rDial = ref('+52')
const rPhone = ref('')
const rCode = ref('')
const rPass = ref('')
const rPass2 = ref('')
const rShowPass = ref(false)
const rLoading = ref(false)
const rError = ref('')

// Temporizador del código (5 min)
const expiresAt = ref(0)
const nowTs = ref(Date.now())
let ticker = null
const startTimer = () => {
  expiresAt.value = Date.now() + 5 * 60 * 1000
  nowTs.value = Date.now()
  clearInterval(ticker)
  ticker = setInterval(() => { nowTs.value = Date.now() }, 1000)
}
const stopTimer = () => { clearInterval(ticker); ticker = null }
const remainingMs = computed(() => Math.max(0, expiresAt.value - nowTs.value))
const expired = computed(() => expiresAt.value > 0 && remainingMs.value <= 0)
const mmss = computed(() => {
  const s = Math.ceil(remainingMs.value / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})
onUnmounted(stopTimer)

const passError = computed(() => (rPass.value && rPass.value.length < 6) ? 'Mínimo 6 caracteres' : '')
const pass2Error = computed(() => (rPass2.value && rPass2.value !== rPass.value) ? 'Las contraseñas no coinciden' : '')

const openReset = () => {
  showReset.value = true; resetStep.value = 'phone'
  rDial.value = '+52'; rPhone.value = ''; rCode.value = ''; rPass.value = ''; rPass2.value = ''
  rError.value = ''
}
const closeReset = () => { showReset.value = false; stopTimer() }

const onPhoneInput = () => { rPhone.value = rPhone.value.replace(/\D/g, '').slice(0, 10) }

const sendCode = async () => {
  if (rPhone.value.length < 10) { rError.value = 'Ingresa un teléfono de 10 dígitos'; return }
  rLoading.value = true; rError.value = ''
  try {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `${rDial.value}${rPhone.value}` }),
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Error')
    resetStep.value = 'code'
    startTimer()
  } catch (e) { rError.value = e.message || 'No se pudo enviar el código' }
  finally { rLoading.value = false }
}

const doReset = async () => {
  if (expired.value) { rError.value = 'El código expiró. Reenvíalo.'; return }
  if (rCode.value.trim().length < 4) { rError.value = 'Ingresa el código recibido'; return }
  if (rPass.value.length < 6) { rError.value = 'La contraseña debe tener al menos 6 caracteres'; return }
  if (rPass.value !== rPass2.value) { rError.value = 'Las contraseñas no coinciden'; return }
  rLoading.value = true; rError.value = ''
  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `${rDial.value}${rPhone.value}`, code: rCode.value.trim(), password: rPass.value }),
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Error')
    resetStep.value = 'done'
  } catch (e) { rError.value = e.message || 'No se pudo cambiar la contraseña' }
  finally { rLoading.value = false }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-br from-brand-green to-brand-dark py-12">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
      <div class="flex flex-col items-center mb-6">
        <img :src="miLogo" alt="WhatServices" class="h-12 w-auto object-contain mb-2" />
        <h1 class="text-2xl font-bold text-brand-dark">Ingresar</h1>
        <p class="text-sm text-gray-500">Accede a tu cuenta de profesional</p>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-4">{{ error }}</div>

      <input v-model="email" type="email" placeholder="Correo electrónico"
        class="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
      <div class="relative mb-2">
        <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Contraseña" @keyup.enter="submit"
          class="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
        <button type="button" @click="showPassword = !showPassword" tabindex="-1"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{{ showPassword ? '🙈' : '👁️' }}</button>
      </div>

      <div class="text-right mb-4">
        <button type="button" @click="openReset" class="text-xs text-brand-green hover:text-brand-lightGreen hover:underline font-medium">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button @click="submit" :disabled="loading"
        class="w-full bg-brand-green text-white py-2.5 rounded-lg hover:bg-brand-lightGreen disabled:opacity-50 font-semibold shadow-sm transition-all duration-200">
        {{ loading ? 'Ingresando...' : 'Ingresar' }}
      </button>

      <p class="text-center text-sm text-gray-500 mt-5">
        ¿Eres profesional y no tienes cuenta?
        <router-link to="/unete" class="text-brand-green font-semibold hover:text-brand-lightGreen hover:underline">Únete</router-link>
      </p>
    </div>
  </div>

  <!-- Modal: restablecer contraseña -->
  <Teleport to="body">
    <div v-if="showReset" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closeReset">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-bold text-gray-800">Restablecer contraseña</h2>
          <button @click="closeReset" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div v-if="rError" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded my-3">{{ rError }}</div>

        <!-- Paso 1: teléfono -->
        <div v-if="resetStep === 'phone'" class="space-y-3 mt-2">
          <p class="text-xs text-gray-500">Te enviaremos un código por WhatsApp al teléfono con el que te registraste.</p>
          <div class="flex gap-2">
            <select v-model="rDial" class="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white shrink-0 w-24 focus:outline-none focus:ring-2 focus:ring-brand-green">
              <option v-for="d in dialCodes" :key="d.code" :value="d.code">{{ d.flag }} {{ d.code }}</option>
            </select>
            <input v-model="rPhone" @input="onPhoneInput" inputmode="numeric" maxlength="10" placeholder="Teléfono (10 dígitos)"
              class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" @keyup.enter="sendCode" />
          </div>
          <button @click="sendCode" :disabled="rLoading"
            class="w-full bg-brand-green text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50">
            {{ rLoading ? 'Enviando...' : 'Enviar código' }}
          </button>
        </div>

        <!-- Paso 2: código + nueva contraseña -->
        <div v-else-if="resetStep === 'code'" class="space-y-3 mt-2">
          <p class="text-xs text-gray-500">Revisa tu WhatsApp e ingresa el código de 6 dígitos.</p>
          <input v-model="rCode" inputmode="numeric" maxlength="6" placeholder="Código"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-brand-green" />
          <div class="flex items-center justify-between text-xs">
            <span v-if="!expired" class="text-gray-500">Válido por <span class="font-mono font-semibold text-brand-medium">{{ mmss }}</span></span>
            <span v-else class="text-red-500">El código expiró.</span>
            <button type="button" @click="sendCode" :disabled="rLoading" class="text-brand-green hover:underline font-medium">Reenviar código</button>
          </div>
          <div>
            <div class="relative">
              <input v-model="rPass" :type="rShowPass ? 'text' : 'password'" placeholder="Nueva contraseña"
                class="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
                :class="passError ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'" />
              <button type="button" @click="rShowPass = !rShowPass" tabindex="-1"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{{ rShowPass ? '🙈' : '👁️' }}</button>
            </div>
            <p v-if="passError" class="text-xs text-red-500 mt-1">{{ passError }}</p>
          </div>
          <div>
            <input v-model="rPass2" :type="rShowPass ? 'text' : 'password'" placeholder="Confirmar contraseña" @keyup.enter="doReset"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              :class="pass2Error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-green'" />
            <p v-if="pass2Error" class="text-xs text-red-500 mt-1">{{ pass2Error }}</p>
          </div>
          <div class="flex gap-2 pt-1">
            <button @click="doReset" :disabled="rLoading"
              class="flex-1 bg-brand-green text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50">
              {{ rLoading ? 'Guardando...' : 'Cambiar contraseña' }}
            </button>
            <button @click="resetStep = 'phone'" class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Atrás</button>
          </div>
        </div>

        <!-- Paso 3: éxito -->
        <div v-else class="text-center py-4">
          <div class="text-4xl mb-2">✅</div>
          <p class="font-semibold text-gray-800">¡Contraseña actualizada!</p>
          <p class="text-sm text-gray-500 mt-1 mb-4">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <button @click="closeReset" class="bg-brand-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-lightGreen">Entendido</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
