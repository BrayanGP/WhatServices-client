import { ref, computed } from 'vue'

const OTP_ENABLED = import.meta.env.VITE_OTP_ENABLED === 'true'

export function useClientOtp(API) {
  const phone        = ref('')
  const name         = ref('')
  const otpCode      = ref('')
  const step         = ref('phone')  // 'phone' | 'otp' | 'register'
  const error        = ref('')
  const loading      = ref(false)
  const attemptsLeft = ref(null)

  // Temporizador del código
  const expiresAt    = ref(0)
  const nowTs        = ref(Date.now())
  let ticker = null
  const startTimer = (ms) => {
    expiresAt.value = Date.now() + (ms || 5 * 60 * 1000)
    nowTs.value = Date.now()
    clearInterval(ticker)
    ticker = setInterval(() => { nowTs.value = Date.now() }, 1000)
  }
  const stopTimer = () => { clearInterval(ticker); ticker = null }
  const remainingMs = computed(() => Math.max(0, expiresAt.value - nowTs.value))
  const codeExpired = computed(() => expiresAt.value > 0 && remainingMs.value <= 0)
  const mmss = computed(() => {
    const s = Math.ceil(remainingMs.value / 1000)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  })

  const onPhone = (e) => { phone.value = e.target.value.replace(/\D/g, '').slice(0, 10) }

  const reset = () => {
    phone.value = ''; name.value = ''; otpCode.value = ''
    step.value = 'phone'; error.value = ''; loading.value = false
    attemptsLeft.value = null; expiresAt.value = 0; stopTimer()
  }

  // Paso 1: verificar si el teléfono ya existe (login) o iniciar OTP (registro)
  const checkPhone = async (onLogin) => {
    error.value = ''
    if (phone.value.length !== 10) { error.value = 'Ingresa tu número de 10 dígitos.'; return }
    loading.value = true
    try {
      const res = await fetch(`${API}/clients/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.value }),
      })
      if (res.ok) {
        const client = await res.json()
        onLogin(client)
        return
      }
      // Número nuevo → enviar OTP
      await _sendOtp()
    } catch {
      error.value = 'Error de conexión, intenta de nuevo.'
    } finally {
      loading.value = false
    }
  }

  // Enviar (o reenviar) OTP
  const _sendOtp = async () => {
    const res = await fetch(`${API}/clients/send-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.value }),
    })
    const data = await res.json()
    if (res.status === 429) { error.value = data.message || 'Demasiados intentos.'; return }
    if (!res.ok) { error.value = data.message || 'No se pudo enviar el código.'; return }
    if (data.otpDisabled) {
      // OTP desactivado en backend → saltar directo a nombre
      step.value = 'register'
      return
    }
    step.value = 'otp'
    otpCode.value = ''
    attemptsLeft.value = null
    error.value = ''
    startTimer(data.expiresInMs)
  }

  const resendOtp = async () => {
    error.value = ''
    loading.value = true
    try { await _sendOtp() } catch { error.value = 'Error al reenviar.' } finally { loading.value = false }
  }

  // Paso 2: verificar código
  const checkOtp = async () => {
    error.value = ''
    if (otpCode.value.trim().length < 6) { error.value = 'Ingresa el código de 6 dígitos.'; return }
    loading.value = true
    try {
      const res = await fetch(`${API}/clients/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.value, code: otpCode.value.trim() }),
      })
      const data = await res.json()
      if (res.status === 429) { error.value = data.message || 'Bloqueado.'; return }
      if (!res.ok) { attemptsLeft.value = data.attemptsLeft ?? null; error.value = data.message || 'Código incorrecto.'; return }
      stopTimer()
      step.value = 'register'
    } catch {
      error.value = 'Error de conexión, intenta de nuevo.'
    } finally {
      loading.value = false
    }
  }

  // Paso 3: registrar
  const doRegister = async (providerId, onSuccess) => {
    error.value = ''
    if (!name.value.trim()) { error.value = 'Escribe tu nombre completo.'; return }
    loading.value = true
    try {
      const res = await fetch(`${API}/clients/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.value.trim(), phone: phone.value, providerId }),
      })
      const data = await res.json()
      if (!res.ok) { error.value = data.message || 'No se pudo registrar.'; return }
      onSuccess(data)
    } catch {
      error.value = 'Ocurrió un error, intenta de nuevo.'
    } finally {
      loading.value = false
    }
  }

  return {
    phone, name, otpCode, step, error, loading, attemptsLeft,
    remainingMs, codeExpired, mmss, OTP_ENABLED,
    onPhone, reset, checkPhone, resendOtp, checkOtp, doRegister, stopTimer,
  }
}
