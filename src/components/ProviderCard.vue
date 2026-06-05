<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({ provider: Object })
const router = useRouter()
</script>

<template>
  <div
    @click="router.push(`/providers/${provider._id}`)"
    class="bg-white rounded-xl shadow hover:shadow-md cursor-pointer transition-shadow overflow-hidden"
  >
    <div class="flex items-stretch">

      <!-- Cuadrícula de fotos lateral izquierda -->
      <div
        v-if="provider.photos && provider.photos.length"
        class="w-24 shrink-0 flex flex-col self-stretch gap-0.5"
      >
        <img
          v-for="(photo, i) in provider.photos.slice(0, 3)"
          :key="i"
          :src="photo.url"
          class="w-full flex-1 object-cover min-h-0 block"
          alt="Trabajo"
        />
      </div>

      <!-- Placeholder si no hay fotos -->
      <div
        v-else
        class="w-24 shrink-0 bg-gray-100 flex items-center justify-center text-gray-300 text-3xl self-stretch"
      >
        📷
      </div>

      <!-- Contenido de la card -->
      <div class="flex-1 min-w-0 p-4 flex flex-col justify-between">

        <!-- Cabecera: avatar + nombre -->
        <div class="flex items-center gap-2 mb-2">
          <img
            v-if="provider.profilePhoto?.url"
            :src="provider.profilePhoto.url"
            class="w-9 h-9 rounded-full object-cover shrink-0"
            alt=""
          />
          <div
            v-else
            class="w-9 h-9 bg-brand-base/20 rounded-full flex items-center justify-center text-sm font-bold text-brand-medium shrink-0"
          >
            {{ provider.businessName?.[0] }}
          </div>
          <div class="min-w-0">
            <h3 class="font-semibold text-gray-800 truncate text-sm leading-tight">{{ provider.businessName }}</h3>
            <p class="text-xs text-gray-500">{{ provider.city }}</p>
          </div>
        </div>

        <!-- Descripción -->
        <p class="text-xs text-gray-600 mb-2 line-clamp-2">{{ provider.description || 'Sin descripción' }}</p>

        <!-- Categorías + rating -->
        <div class="flex items-center justify-between gap-1">
          <div class="flex gap-1 flex-wrap min-w-0">
            <span
              v-for="cat in provider.categories?.slice(0, 2)"
              :key="cat"
              class="text-xs bg-brand-base/10 text-brand-medium px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
            >{{ cat }}</span>
          </div>
          <div class="flex items-center gap-0.5 text-xs shrink-0">
            <span class="text-yellow-400">★</span>
            <span class="font-medium">{{ provider.rating?.average || 0 }}</span>
            <span class="text-gray-400">({{ provider.rating?.count || 0 }})</span>
          </div>
        </div>

        <!-- Disponibilidad -->
        <span
          :class="provider.availability === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          class="mt-2 text-xs px-2 py-0.5 rounded-full inline-block w-fit"
        >
          {{ provider.availability === 'available' ? '● Disponible' : provider.availability }}
        </span>

      </div>
    </div>
  </div>
</template>
