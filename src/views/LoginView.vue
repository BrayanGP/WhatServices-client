<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useClientOtp } from '../composables/useClientOtp'
import miLogo from '../assets/logoWhatServices.png'

const API = import.meta.env.VITE_API_URL || '/api'
const router = useRouter()
const auth = useAuthStore()

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tab = ref('cliente') // 'cliente' | 'profesional'

// ── Login profesional ─────────────────────────────────────────────────────────
const loginDial = ref('+52')
const loginPhone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const cA = ref(0); const cB = ref(0); const cOp = ref('+'); const cExpected = ref(0)
const cAns = ref(''); const hp = ref('')
const genCaptcha = () => {
  cA.value = Math.floor(Math.random() * 8) + 2
  cB.value = Math.floor(Math.random() * 8) + 2
  cOp.value = Math.random() < 0.5 ? '+' : '×'
  cExpected.value = cOp.value === '+' ? cA.value + cB.value : cA.value * cB.value
  cAns.value = ''
}
genCaptcha()
const onLoginPhone = () => { loginPhone.value = loginPhone.value.replace(/\D/g, '').slice(0, 10) }

const submit = async () => {
  error.value = ''
  if (hp.value) return
  if (loginPhone.value.length < 10) { error.value = 'Ingresa tu teléfono (10 dígitos)'; return }
  if (Number(cAns.value) !== cExpected.value) { error.value = 'Captcha incorrecto'; genCaptcha(); return }
  loading.value = true
  try {
    await auth.login({ phone: `${loginDial.value}${loginPhone.value}`, password: password.value })
    router.push('/')
  } catch (e) {
    error.value = e.message
    genCaptcha()
  } finally {
    loading.value = false
  }
}

// ── Login / registro cliente con OTP ─────────────────────────────────────────
const CLIENT_KEY      = 'ws_client_phone'
const CLIENT_NAME_KEY = 'ws_client_name'

const otp = useClientOtp(API)

const saveClientSession = (phone, name) => {
  localStorage.setItem(CLIENT_KEY, phone)
  localStorage.setItem(CLIENT_NAME_KEY, name)
  router.push('/providers')
}

const clientCheckPhone = () => otp.checkPhone((client) => {
  saveClientSession(otp.phone.value, client.name || '')
})

const clientDoRegister = () => otp.doRegister(null, (client) => {
  saveClientSession(otp.phone.value, client.name || otp.name.value)
})

const resetClientForm = () => otp.reset()

// ── Olvidé mi contraseña ──────────────────────────────────────────────────────
const dialCodes = [
  { code: '+52', flag: '🇲🇽' }, { code: '+1', flag: '🇺🇸' }, { code: '+54', flag: '🇦🇷' },
  { code: '+57', flag: '🇨🇴' }, { code: '+56', flag: '🇨🇱' }, { code: '+51', flag: '🇵🇪' },
  { code: '+593', flag: '🇪🇨' }, { code: '+502', flag: '🇬🇹' }, { code: '+34', flag: '🇪🇸' },
]
const showReset = ref(false); const resetStep = ref('phone')
const rDial = ref('+52'); const rPhone = ref(''); const rCode = ref('')
const rPass = ref(''); const rPass2 = ref(''); const rShowPass = ref(false)
const rLoading = ref(false); const rError = ref('')
const expiresAt = ref(0); const nowTs = ref(Date.now())
let ticker = null
const startTimer = () => {
  expiresAt.value = Date.now() + 5 * 60 * 1000; nowTs.value = Date.now()
  clearInterval(ticker); ticker = setInterval(() => { nowTs.value = Date.now() }, 1000)
}
const stopTimer = () => { clearInterval(ticker); ticker = null }
const remainingMs = computed(() => Math.max(0, expiresAt.value - nowTs.value))
const expired = computed(() => expiresAt.value > 0 && remainingMs.value <= 0)
const mmss = computed(() => {
  const s = Math.ceil(remainingMs.value / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})
onUnmounted(stopTimer)
const passError  = computed(() => (rPass.value && rPass.value.length < 6) ? 'Mínimo 6 caracteres' : '')
const pass2Error = computed(() => (rPass2.value && rPass2.value !== rPass.value) ? 'Las contraseñas no coinciden' : '')
const openReset  = () => { showReset.value = true; resetStep.value = 'phone'; rDial.value = '+52'; rPhone.value = ''; rCode.value = ''; rPass.value = ''; rPass2.value = ''; rError.value = '' }
const closeReset = () => { showReset.value = false; stopTimer() }
const onPhoneInput = () => { rPhone.value = rPhone.value.replace(/\D/g, '').slice(0, 10) }
const sendCode = async () => {
  if (rPhone.value.length < 10) { rError.value = 'Ingresa un teléfono de 10 dígitos'; return }
  rLoading.value = true; rError.value = ''
  try {
    const res = await fetch(`${API}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: `${rDial.value}${rPhone.value}` }) })
    if (!res.ok) throw new Error((await res.json()).message || 'Error')
    resetStep.value = 'code'; startTimer()
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
    const res = await fetch(`${API}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: `${rDial.value}${rPhone.value}`, code: rCode.value.trim(), password: rPass.value }) })
    if (!res.ok) throw new Error((await res.json()).message || 'Error')
    resetStep.value = 'done'
  } catch (e) { rError.value = e.message || 'No se pudo cambiar la contraseña' }
  finally { rLoading.value = false }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-br from-brand-green to-brand-dark py-12">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

      <!-- Logo -->
      <div class="flex flex-col items-center pt-8 pb-4 px-8">
        <img :src="miLogo" alt="WhatServices" class="h-12 w-auto object-contain mb-2" />
        <h1 class="text-2xl font-bold text-brand-dark">Ingresar</h1>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-100 mx-6">
        <button @click="tab = 'cliente'; resetClientForm()"
          class="flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px"
          :class="tab === 'cliente' ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-400 hover:text-gray-600'">
          Soy cliente
        </button>
        <button @click="tab = 'profesional'"
          class="flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px"
          :class="tab === 'profesional' ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-400 hover:text-gray-600'">
          Soy profesional
        </button>
      </div>

      <div class="px-8 py-6">

        <!-- ── Tab cliente ── -->
        <template v-if="tab === 'cliente'">
          <p class="text-sm text-gray-500 mb-4 text-center">
            {{ otp.step.value === 'phone' ? 'Ingresa tu número para continuar'
              : otp.step.value === 'otp' ? 'Revisa tu SMS e ingresa el código'
              : '¡Casi listo! Dinos tu nombre' }}
          </p>

          <div v-if="otp.error.value" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{{ otp.error.value }}</div>

          <!-- Paso 1: teléfono -->
          <div v-if="otp.step.value === 'phone'" class="space-y-4">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Número de celular</label>
              <div class="relative">
                <input :value="otp.phone.value" @input="otp.onPhone" type="tel" inputmode="numeric" maxlength="10"
                  placeholder="Ej. 7711234567" @keyup.enter="clientCheckPhone"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green pr-12" />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  :class="otp.phone.value.length === 10 ? 'text-brand-green font-medium' : 'text-gray-300'">
                  {{ otp.phone.value.length }}/10
                </span>
              </div>
            </div>
            <button @click="clientCheckPhone" :disabled="otp.loading.value || otp.phone.value.length !== 10"
              class="w-full bg-brand-green text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-lightGreen disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {{ otp.loading.value ? 'Verificando...' : 'Continuar' }}
            </button>
          </div>

          <!-- Paso 2: código OTP (solo si OTP activo) -->
          <div v-else-if="otp.step.value === 'otp'" class="space-y-4">
            <div class="flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 rounded-xl px-3 py-2.5">
              <span class="text-brand-green text-sm">📱</span>
              <span class="text-sm text-brand-green font-medium">{{ otp.phone.value }}</span>
              <button @click="otp.step.value = 'phone'" class="ml-auto text-xs text-gray-400 hover:text-brand-green underline">Cambiar</button>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Código de verificación (6 dígitos)</label>
              <input v-model="otp.otpCode.value" inputmode="numeric" maxlength="6" placeholder="······"
                @keyup.enter="otp.checkOtp"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span v-if="!otp.codeExpired.value">Válido por <span class="font-mono font-semibold text-brand-green">{{ otp.mmss.value }}</span></span>
              <span v-else class="text-red-500">Código expirado</span>
              <span v-if="otp.attemptsLeft.value != null" class="text-amber-600">Intentos restantes: {{ otp.attemptsLeft.value }}</span>
              <button type="button" @click="otp.resendOtp" :disabled="otp.loading.value || !otp.codeExpired.value"
                :class="otp.codeExpired.value && !otp.loading.value ? 'text-brand-green hover:underline font-medium' : 'text-gray-300 cursor-not-allowed'">
                Reenviar
              </button>
            </div>
            <button @click="otp.checkOtp" :disabled="otp.loading.value || otp.otpCode.value.length < 6 || otp.codeExpired.value"
              class="w-full bg-brand-green text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-lightGreen disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {{ otp.loading.value ? 'Verificando...' : 'Verificar código' }}
            </button>
          </div>

          <!-- Paso 3: nombre (número nuevo, OTP verificado) -->
          <div v-else class="space-y-4">
            <div class="flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 rounded-xl px-3 py-2.5">
              <span class="text-brand-green text-sm">✅</span>
              <span class="text-sm text-brand-green font-medium">{{ otp.phone.value }} verificado</span>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Tu nombre completo</label>
              <input v-model="otp.name.value" type="text" placeholder="Ej. María López" @keyup.enter="clientDoRegister"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <button @click="clientDoRegister" :disabled="otp.loading.value || !otp.name.value.trim()"
              class="w-full bg-brand-green text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-lightGreen disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {{ otp.loading.value ? 'Registrando...' : 'Registrarme e ingresar' }}
            </button>
          </div>

          <p class="text-center text-xs text-gray-400 mt-5">
            ¿Eres profesional?
            <button @click="tab = 'profesional'" class="text-brand-green font-medium hover:underline">Inicia sesión aquí</button>
          </p>
        </template>

        <!-- ── Tab profesional ── -->
        <template v-else>
          <p class="text-sm text-gray-500 mb-5 text-center">Accede con tu teléfono y contraseña</p>

          <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{{ error }}</div>

          <div class="space-y-3">
            <div class="flex gap-2 items-center">
              <select v-model="loginDial" class="border border-gray-200 rounded-lg px-2 py-2.5 text-sm bg-white shrink-0 w-24 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen">
                <option v-for="d in dialCodes" :key="d.code" :value="d.code">{{ d.flag }} {{ d.code }}</option>
              </select>
              <input v-model="loginPhone" @input="onLoginPhone" inputmode="numeric" maxlength="10" placeholder="Teléfono"
                class="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
            </div>
            <div class="relative">
              <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Contraseña" @keyup.enter="submit"
                class="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
              <button type="button" @click="showPassword = !showPassword" tabindex="-1"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{{ showPassword ? '🙈' : '👁️' }}</button>
            </div>

            <!-- Honeypot -->
            <input v-model="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" class="absolute opacity-0 h-0 w-0 -left-[9999px]" />

            <!-- Captcha -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600 shrink-0">¿Cuánto es <b>{{ cA }} {{ cOp }} {{ cB }}</b>?</span>
              <input v-model="cAns" inputmode="numeric" placeholder="Resultado" @keyup.enter="submit"
                class="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-lightGreen" />
              <button type="button" @click="genCaptcha" title="Otro reto" class="text-gray-400 hover:text-gray-600">🔄</button>
            </div>

            <div class="text-right">
              <button type="button" @click="openReset" class="text-xs text-brand-green hover:text-brand-lightGreen hover:underline font-medium">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button @click="submit" :disabled="loading"
              class="w-full bg-brand-green text-white py-2.5 rounded-lg hover:bg-brand-lightGreen disabled:opacity-50 font-semibold shadow-sm transition-all">
              {{ loading ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </div>

          <p class="text-center text-sm text-gray-500 mt-5">
            ¿No tienes cuenta?
            <router-link to="/unete" class="text-brand-green font-semibold hover:text-brand-lightGreen hover:underline">Únete</router-link>
          </p>
        </template>

      </div>
    </div>
  </div>

  <!-- Modal: restablecer contraseña -->
  <Teleport to="body">
    <div v-if="showReset" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4" @click.self="closeReset">
      <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-bold text-gray-800">Restablecer contraseña</h2>
          <button @click="closeReset" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div v-if="rError" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded my-3">{{ rError }}</div>
        <div v-if="resetStep === 'phone'" class="space-y-3 mt-2">
          <p class="text-xs text-gray-500">Te enviaremos un código por SMS al teléfono con el que te registraste.</p>
          <div class="flex gap-2 items-center w-full">
            <select v-model="rDial" class="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white shrink-0 w-24 focus:outline-none focus:ring-2 focus:ring-brand-green">
              <option v-for="d in dialCodes" :key="d.code" :value="d.code">{{ d.flag }} {{ d.code }}</option>
            </select>
            <input v-model="rPhone" @input="onPhoneInput" inputmode="numeric" maxlength="10" placeholder="Teléfono (10 dígitos)"
              class="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" @keyup.enter="sendCode" />
          </div>
          <button @click="sendCode" :disabled="rLoading" class="w-full bg-brand-green text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50">
            {{ rLoading ? 'Enviando...' : 'Enviar código' }}
          </button>
        </div>
        <div v-else-if="resetStep === 'code'" class="space-y-3 mt-2">
          <p class="text-xs text-gray-500">Revisa tus mensajes SMS e ingresa el código de 6 dígitos.</p>
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
            <button @click="doReset" :disabled="rLoading" class="flex-1 bg-brand-green text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50">
              {{ rLoading ? 'Guardando...' : 'Cambiar contraseña' }}
            </button>
            <button @click="resetStep = 'phone'" class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Atrás</button>
          </div>
        </div>
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
