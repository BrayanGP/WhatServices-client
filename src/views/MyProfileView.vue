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

// ── Modal de edición ──────────────────────────────────────────────────────────
const editModal = ref(false)
const draft = ref({})
const editError = ref('')

const openEdit = () => {
  draft.value = {
    businessName: provider.value.businessName || '',
    description:  provider.value.description  || '',
    city:         provider.value.city         || '',
    postalCode:   provider.value.postalCode   || '',
    categories:   [...(provider.value.categories || [])],
    availability: provider.value.availability || 'available',
    email:        provider.value.email        || auth.user?.email || '',
  }
  editError.value = ''
  editModal.value = true
}

const toggleDraftCat = (name) => {
  const i = draft.value.categories.indexOf(name)
  if (i === -1) draft.value.categories.push(name)
  else draft.value.categories.splice(i, 1)
}

const draftHasCategory = computed(() => draft.value.categories?.length > 0)
const draftDirty = computed(() => {
  if (!provider.value) return false
  return JSON.stringify({
    businessName: draft.value.businessName,
    description:  draft.value.description,
    city:         draft.value.city,
    postalCode:   draft.value.postalCode,
    categories:   [...(draft.value.categories || [])].sort(),
    availability: draft.value.availability,
    email:        draft.value.email,
  }) !== JSON.stringify({
    businessName: provider.value.businessName || '',
    description:  provider.value.description  || '',
    city:         provider.value.city         || '',
    postalCode:   provider.value.postalCode   || '',
    categories:   [...(provider.value.categories || [])].sort(),
    availability: provider.value.availability || 'available',
    email:        auth.user?.email            || '',
  })
})
const canSave = computed(() => draftDirty.value && draftHasCategory.value)

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

const save = async () => {
  saving.value = true; msg.value = ''; editError.value = ''
  try {
    const { businessName, description, city, postalCode, categories: cats, availability, email } = draft.value
    const res = await auth.authFetch(`${API}/providers/${provider.value._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, description, city, postalCode, categories: cats, availability, email }),
    })
    if (res.ok) {
      auth.user = { ...auth.user, email: email?.trim() || null }
      provider.value = await res.json()
      editModal.value = false
      msg.value = '✅ Información actualizada'
      setTimeout(() => (msg.value = ''), 3000)
    } else {
      const err = await res.json().catch(() => ({}))
      editError.value = err.message || 'Error al guardar'
    }
  } finally { saving.value = false }
}

// ── Cambiar contraseña ───────────────────────────────────────────────────────
const pwModal = ref(false)
const pwCurrent = ref('')
const pwNew = ref('')
const pwNew2 = ref('')
const pwShow = ref(false)
const pwSaving = ref(false)
const pwError = ref('')
const pwOk = ref('')

const openPasswordModal = () => {
  editModal.value = false // cierra el de editar perfil
  pwCurrent.value = ''; pwNew.value = ''; pwNew2.value = ''
  pwError.value = ''; pwOk.value = ''
  pwModal.value = true
}

const changePassword = async () => {
  pwError.value = ''; pwOk.value = ''
  if (!pwCurrent.value) { pwError.value = 'Ingresa tu contraseña actual'; return }
  if (pwNew.value.length < 6) { pwError.value = 'La nueva contraseña debe tener al menos 6 caracteres'; return }
  if (pwNew.value !== pwNew2.value) { pwError.value = 'Las contraseñas nuevas no coinciden'; return }
  pwSaving.value = true
  try {
    const res = await auth.authFetch(`${API}/auth/password`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwCurrent.value, newPassword: pwNew.value }),
    })
    if (!res.ok) throw new Error((await res.json()).message || 'No se pudo actualizar')
    pwOk.value = '✅ Contraseña actualizada'
    pwCurrent.value = ''; pwNew.value = ''; pwNew2.value = ''
    setTimeout(() => { pwModal.value = false; pwOk.value = '' }, 1500)
  } catch (e) { pwError.value = e.message || 'Error al actualizar' }
  finally { pwSaving.value = false }
}

// ── Fotos por álbum/categoría ────────────────────────────────────────────────
const WHATSAPP_ALBUM = 'WhatsApp'
const DEFAULT_ALBUM = 'default'
const WHATSAPP_MAX = 5
const MAX_TOTAL = 60

const profileFile = ref(null)
const profilePreview = ref(null)
const newPhotos = ref([])
const newPreviews = ref([])
const uploadingPhotos = ref(false)
const photoMsg = ref('')
const currentAlbum = ref(WHATSAPP_ALBUM)
const pickerOpen = ref(false)

const allPhotos = computed(() => provider.value?.photos || [])
const albumList = computed(() => [WHATSAPP_ALBUM, DEFAULT_ALBUM, ...((provider.value?.albums) || [])])
const albumLabel = (a) => (a === WHATSAPP_ALBUM ? '⭐ WhatsApp' : a === DEFAULT_ALBUM ? '🗂️ Todas' : a)
const inAlbum = (ph, a) => (ph.albums || [DEFAULT_ALBUM]).includes(a)
const albumPhotos = computed(() => (provider.value?.photos || []).filter((p) => inAlbum(p, currentAlbum.value)))
const waCount = computed(() => (provider.value?.photos || []).filter((p) => inAlbum(p, WHATSAPP_ALBUM)).length)

const roomLeft = computed(() => {
  if (currentAlbum.value === WHATSAPP_ALBUM) return Math.max(0, WHATSAPP_MAX - waCount.value - newPhotos.value.length)
  return Math.max(0, MAX_TOTAL - (provider.value?.photos?.length || 0) - newPhotos.value.length)
})

const flashPhoto = (m) => { photoMsg.value = m; setTimeout(() => (photoMsg.value = ''), 2800) }

const selectAlbum = (a) => { currentAlbum.value = a; newPhotos.value = []; newPreviews.value = [] }

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
      const fd = new FormData()
      newPhotos.value.forEach((f) => fd.append('photos', f))
      fd.append('album', currentAlbum.value)
      const r = await auth.authFetch(`${API}/providers/${provider.value._id}/photos`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error((await r.json()).message || 'Error al subir fotos')
      const data = await r.json()
      provider.value.photos = data.photos
      if (data.albums) provider.value.albums = data.albums
      newPhotos.value = []; newPreviews.value = []
    }
    flashPhoto('✅ Fotos actualizadas')
  } catch (e) { photoMsg.value = e.message || 'Error al subir' }
  finally { uploadingPhotos.value = false }
}

const deletePhoto = async (ph) => {
  if (!confirm('¿Eliminar esta foto?')) return
  try {
    const r = await auth.authFetch(`${API}/providers/${provider.value._id}/photos`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: ph.publicId }),
    })
    if (!r.ok) throw new Error((await r.json()).message || 'Error')
    provider.value.photos = (await r.json()).photos
  } catch (e) { flashPhoto(e.message || 'Error al eliminar') }
}

// Mostrar/quitar una foto del álbum de WhatsApp (lo que ve el cliente en el bot)
const toggleWhatsapp = async (ph) => {
  const inWa = inAlbum(ph, WHATSAPP_ALBUM)
  if (!inWa && waCount.value >= WHATSAPP_MAX) { flashPhoto(`El álbum de WhatsApp admite máximo ${WHATSAPP_MAX} fotos.`); return }
  const albums = inWa
    ? (ph.albums || []).filter((a) => a !== WHATSAPP_ALBUM)
    : [...(ph.albums || []), WHATSAPP_ALBUM]
  try {
    const r = await auth.authFetch(`${API}/providers/${provider.value._id}/photos`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: ph.publicId, albums }),
    })
    if (!r.ok) throw new Error((await r.json()).message || 'Error')
    provider.value.photos = (await r.json()).photos
  } catch (e) { flashPhoto(e.message || 'Error') }
}

// Asignar/quitar una foto a cualquier categoría (repartir desde "Todas")
const assignPhoto = ref(null) // foto que se está asignando (abre el modal)
const customAlbums = computed(() => (provider.value?.albums) || [])
const togglePhotoAlbum = async (ph, album) => {
  const has = inAlbum(ph, album)
  if (album === WHATSAPP_ALBUM && !has && waCount.value >= WHATSAPP_MAX) { flashPhoto(`El álbum de WhatsApp admite máximo ${WHATSAPP_MAX} fotos.`); return }
  let albums = has ? (ph.albums || []).filter((a) => a !== album) : [...(ph.albums || []), album]
  if (!albums.includes(DEFAULT_ALBUM)) albums.push(DEFAULT_ALBUM) // siempre permanece en "Todas"
  try {
    const r = await auth.authFetch(`${API}/providers/${provider.value._id}/photos`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: ph.publicId, albums }),
    })
    if (!r.ok) throw new Error((await r.json()).message || 'Error')
    provider.value.photos = (await r.json()).photos
    // refrescar la foto seleccionada en el modal
    if (assignPhoto.value) assignPhoto.value = provider.value.photos.find((p) => p.publicId === assignPhoto.value.publicId) || null
  } catch (e) { flashPhoto(e.message || 'Error') }
}

const createAlbum = async () => {
  const name = prompt('Nombre de la nueva categoría (ej. Puertas, Closets, Cocinas):')
  if (!name || !name.trim()) return
  try {
    const r = await auth.authFetch(`${API}/providers/${provider.value._id}/albums`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }),
    })
    if (!r.ok) throw new Error((await r.json()).message || 'Error')
    provider.value.albums = (await r.json()).albums
    currentAlbum.value = name.trim()
  } catch (e) { flashPhoto(e.message || 'Error al crear') }
}

const deleteAlbum = async (a) => {
  if (a === WHATSAPP_ALBUM || a === DEFAULT_ALBUM) return
  if (!confirm(`¿Eliminar la categoría "${a}"? Las fotos quedan en "Todas".`)) return
  try {
    const r = await auth.authFetch(`${API}/providers/${provider.value._id}/albums`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: a }),
    })
    if (!r.ok) throw new Error((await r.json()).message || 'Error')
    const d = await r.json()
    provider.value.photos = d.photos; provider.value.albums = d.albums
    currentAlbum.value = DEFAULT_ALBUM
  } catch (e) { flashPhoto(e.message || 'Error al eliminar') }
}

// QR generado en el frontend con qrserver.com (sin headers, funciona como <img src>)
const profilePageUrl = computed(() =>
  provider.value ? `${CLIENT_URL}/providers/${provider.value._id}` : ''
)
const profileQrUrl = computed(() => {
  if (!profilePageUrl.value) return ''
  const data = encodeURIComponent(profilePageUrl.value)
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${data}&color=1a3a2a&bgcolor=ffffff&margin=10`
})

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

  <!-- Selector de fotos para WhatsApp (elegir entre las ya subidas) -->
  <Teleport to="body">
    <div v-if="pickerOpen" @click.self="pickerOpen = false"
      class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[88vh] sm:max-h-[82vh] overflow-y-auto p-5">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-bold text-gray-800">Elige las fotos para WhatsApp</h3>
          <span class="text-sm font-semibold" :class="waCount >= WHATSAPP_MAX ? 'text-amber-600' : 'text-gray-400'">⭐ {{ waCount }}/{{ WHATSAPP_MAX }}</span>
        </div>
        <p class="text-sm text-gray-500 mb-4">Toca una foto para mostrarla u ocultarla en WhatsApp (máx {{ WHATSAPP_MAX }}).</p>
        <div class="grid grid-cols-3 gap-2">
          <div v-for="(ph, i) in allPhotos" :key="ph.publicId || i" @click="toggleWhatsapp(ph)"
            class="relative aspect-square rounded-lg overflow-hidden cursor-pointer ring-2 transition-all"
            :class="inAlbum(ph, WHATSAPP_ALBUM) ? 'ring-amber-400' : 'ring-transparent hover:ring-gray-200'">
            <img :src="ph.url" class="w-full h-full object-cover"
              :class="(!inAlbum(ph, WHATSAPP_ALBUM) && waCount >= WHATSAPP_MAX) ? 'opacity-40' : ''" />
            <div v-if="inAlbum(ph, WHATSAPP_ALBUM)" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-amber-400 text-white text-sm flex items-center justify-center shadow">⭐</div>
          </div>
        </div>
        <p v-if="!allPhotos.length" class="text-sm text-gray-400 text-center py-6">Aún no tienes fotos. Súbelas en "Todas" o en una categoría.</p>
        <button @click="pickerOpen = false"
          class="mt-5 w-full bg-brand-green text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen">Listo</button>
      </div>
    </div>
  </Teleport>

  <!-- Modal: asignar foto a categorías -->
  <Teleport to="body">
    <div v-if="assignPhoto" @click.self="assignPhoto = null"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-gray-800">Asignar a categorías</h3>
          <button @click="assignPhoto = null" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div class="flex gap-3 mb-4">
          <img :src="assignPhoto.url" class="w-20 h-20 rounded-lg object-cover bg-gray-100" />
          <p class="text-xs text-gray-500 self-center">Toca una categoría para agregar o quitar esta foto. Siempre permanece en “Todas”.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" @click="togglePhotoAlbum(assignPhoto, WHATSAPP_ALBUM)"
            :class="['text-sm px-3 py-1.5 rounded-full border', inAlbum(assignPhoto, WHATSAPP_ALBUM) ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-gray-600 border-gray-300']">
            ⭐ WhatsApp
          </button>
          <button v-for="a in customAlbums" :key="a" type="button" @click="togglePhotoAlbum(assignPhoto, a)"
            :class="['text-sm px-3 py-1.5 rounded-full border', inAlbum(assignPhoto, a) ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300']">
            {{ a }}
          </button>
          <button type="button" @click="createAlbum"
            class="text-sm px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-brand-green">➕ Nueva</button>
        </div>
        <button @click="assignPhoto = null" class="mt-5 w-full bg-brand-green text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen">Listo</button>
      </div>
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
          <div class="flex items-start justify-between gap-3">
            <div>
              <h1 class="text-xl font-bold text-gray-900">{{ provider.businessName }}</h1>
              <p class="text-sm text-gray-500 mt-0.5">📍 {{ provider.city }}{{ provider.postalCode ? ` · CP ${provider.postalCode}` : '' }}</p>
            </div>
            <button @click="openEdit"
              class="shrink-0 flex items-center gap-1.5 border border-brand-green text-brand-green px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-green hover:text-white transition-colors">
              ✏️ Editar
            </button>
          </div>
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
          <p v-if="msg" class="text-sm text-brand-green mt-3">{{ msg }}</p>
        </div>
      </div>

      <!-- ── Modal editar información ── -->
      <Teleport to="body">
        <div v-if="editModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4 py-0 sm:py-6" @click.self="editModal = false">
          <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <h2 class="text-base font-bold text-gray-800">Editar información</h2>
              <button @click="editModal = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <!-- Cuerpo con scroll -->
            <div class="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Nombre del negocio</label>
                <input v-model="draft.businessName" placeholder="Nombre del negocio"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Descripción</label>
                <textarea v-model="draft.description" rows="3" placeholder="Describe tus servicios"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"></textarea>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Correo electrónico</label>
                <input v-model="draft.email" type="text" inputmode="email" placeholder="correo@ejemplo.com"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-gray-500 mb-1 block">Ciudad</label>
                  <input v-model="draft.city" placeholder="Ciudad"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 mb-1 block">Código postal</label>
                  <input v-model="draft.postalCode" placeholder="CP"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 mb-2 block">Servicios</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="c in categories" :key="c._id" type="button" @click="toggleDraftCat(c.name)"
                    class="text-sm px-3 py-1.5 rounded-full border transition-colors"
                    :class="draft.categories?.includes(c.name) ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-green'">
                    {{ c.icon }} {{ c.name }}
                  </button>
                </div>
                <p v-if="!draftHasCategory" class="text-xs text-amber-600 mt-2">⚠️ Selecciona al menos un servicio para guardar.</p>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Disponibilidad</label>
                <select v-model="draft.availability"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green">
                  <option value="available">Disponible</option>
                  <option value="busy">Ocupado</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="editError" class="px-6 pb-2">
              <p class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ editError }}</p>
            </div>
            <div class="px-6 pt-3">
              <button @click="openPasswordModal" type="button"
                class="text-sm text-brand-green font-medium hover:underline flex items-center gap-1">
                🔒 Actualizar contraseña
              </button>
            </div>
            <div class="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button @click="save" :disabled="saving || !canSave"
                class="flex-1 bg-brand-green text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
              <button @click="editModal = false"
                class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-gray-300 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ── Modal: actualizar contraseña ── -->
      <Teleport to="body">
        <div v-if="pwModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4" @click.self="pwModal = false">
          <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-bold text-gray-800">Actualizar contraseña</h2>
              <button @click="pwModal = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div v-if="pwError" class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-3">{{ pwError }}</div>
            <div v-if="pwOk" class="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded mb-3">{{ pwOk }}</div>

            <div class="space-y-3">
              <div class="relative">
                <input v-model="pwCurrent" :type="pwShow ? 'text' : 'password'" placeholder="Contraseña actual"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                <button type="button" @click="pwShow = !pwShow" tabindex="-1"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{{ pwShow ? '🙈' : '👁️' }}</button>
              </div>
              <input v-model="pwNew" :type="pwShow ? 'text' : 'password'" placeholder="Nueva contraseña (mín. 6)"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
              <input v-model="pwNew2" :type="pwShow ? 'text' : 'password'" placeholder="Confirmar nueva contraseña" @keyup.enter="changePassword"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>

            <div class="flex items-center gap-3 mt-4">
              <button @click="changePassword" :disabled="pwSaving"
                class="flex-1 bg-brand-green text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen disabled:opacity-50 transition-colors">
                {{ pwSaving ? 'Guardando...' : 'Cambiar contraseña' }}
              </button>
              <button @click="pwModal = false"
                class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-gray-300 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Teleport>

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

        <!-- Fotos de trabajos por categoría/álbum -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-gray-700">Fotos de tus trabajos</p>
            <span class="text-xs" :class="waCount >= WHATSAPP_MAX ? 'text-amber-600' : 'text-gray-400'">⭐ WhatsApp: {{ waCount }}/{{ WHATSAPP_MAX }}</span>
          </div>

          <!-- Pestañas de álbumes -->
          <div class="flex flex-wrap gap-2 mb-3">
            <button v-for="a in albumList" :key="a" type="button" @click="selectAlbum(a)"
              :class="['text-sm px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-colors',
                       currentAlbum === a ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50']">
              <span>{{ albumLabel(a) }}</span>
              <span v-if="a !== WHATSAPP_ALBUM && a !== DEFAULT_ALBUM" @click.stop="deleteAlbum(a)"
                class="opacity-60 hover:opacity-100 hover:text-red-200 text-base leading-none">✕</span>
            </button>
            <button type="button" @click="createAlbum"
              class="text-sm px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-brand-green hover:text-brand-green">➕ Categoría</button>
          </div>

          <template v-if="currentAlbum === WHATSAPP_ALBUM">
            <div class="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p class="text-sm text-amber-700 font-semibold">⭐ Estas son las fotos que muestra el bot de WhatsApp.</p>
              <p class="text-sm text-amber-600 mt-0.5">Cuando un cliente te encuentra por WhatsApp, verá estas fotos (máximo 5). Elige tus mejores trabajos.</p>
            </div>
            <button v-if="allPhotos.length" type="button" @click="pickerOpen = true"
              class="mb-3 text-sm px-3 py-2 rounded-lg border border-brand-green text-brand-green font-medium hover:bg-brand-green/5">
              🖼️ Elegir de mis fotos
            </button>
          </template>
          <p v-else-if="currentAlbum === DEFAULT_ALBUM" class="text-sm text-gray-500 mb-2">Todas tus fotos. Puedes subir las que quieras.</p>
          <p v-else class="text-sm text-gray-500 mb-2">Categoría propia. Sube las fotos que quieras.</p>

          <div class="grid grid-cols-3 gap-2 mb-2">
            <!-- Existentes del álbum -->
            <div v-for="(ph, i) in albumPhotos" :key="ph.publicId || i"
              class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
              <img :src="ph.url" @click="lightbox = ph.url" class="w-full h-full object-cover cursor-zoom-in hover:opacity-90" />
              <button type="button" @click="deletePhoto(ph)"
                class="absolute top-1 right-1 w-8 h-8 rounded-full bg-red-500 text-white text-sm flex items-center justify-center hover:bg-red-600 leading-none shadow">✕</button>
              <button type="button" @click="toggleWhatsapp(ph)"
                :title="inAlbum(ph, WHATSAPP_ALBUM) ? 'Quitar de WhatsApp' : 'Mostrar en WhatsApp'"
                :class="['absolute bottom-1 left-1 w-8 h-8 rounded-full text-base flex items-center justify-center leading-none shadow',
                         inAlbum(ph, WHATSAPP_ALBUM) ? 'bg-amber-400 text-white' : 'bg-black/40 text-white hover:bg-black/60']">⭐</button>
              <button type="button" @click="assignPhoto = ph" title="Asignar a categorías"
                class="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-black/40 text-white text-base flex items-center justify-center leading-none shadow hover:bg-black/60">🏷️</button>
            </div>
            <!-- Nuevas (preview, sin subir) -->
            <div v-for="(src, i) in newPreviews" :key="'new' + i" class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 ring-brand-green/40">
              <img :src="src" class="w-full h-full object-cover" />
              <button type="button" @click="removeNew(i)"
                class="absolute top-1 right-1 w-8 h-8 rounded-full bg-red-500 text-white text-sm flex items-center justify-center hover:bg-red-600 leading-none shadow">✕</button>
            </div>
            <!-- Slot agregar -->
            <label v-if="roomLeft > 0" class="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-green hover:bg-brand-green/5 transition-colors">
              <span class="text-2xl text-gray-300">+</span>
              <span class="text-xs text-gray-400 mt-1">Agregar</span>
              <input type="file" accept="image/*" multiple @change="onWorks" class="hidden" />
            </label>
          </div>
          <p class="text-xs text-gray-400">⭐ WhatsApp (máx 5) · 🏷️ asignar a categorías · ✕ eliminar. Toca una foto para ampliarla.</p>
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

        <!-- Acción descarga -->
        <div class="flex justify-center">
          <button
            @click="downloadQr"
            class="inline-flex items-center gap-2 bg-brand-green text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-lightGreen transition-colors shadow-sm"
          >
            ⬇️ Descargar QR
          </button>
        </div>
      </div>
    </template>
  </main>
</template>
