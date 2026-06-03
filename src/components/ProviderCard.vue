<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({ provider: Object })
const router = useRouter()
</script>

<template>
  <div
    @click="router.push(`/providers/${provider._id}`)"
    class="bg-white rounded-xl shadow hover:shadow-md cursor-pointer p-5 transition-shadow"
  >
    <div class="flex items-center gap-3 mb-3">
      <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600 shrink-0">
        {{ provider.businessName?.[0] }}
      </div>
      <div class="min-w-0">
        <h3 class="font-semibold text-gray-800 truncate">{{ provider.businessName }}</h3>
        <p class="text-sm text-gray-500">{{ provider.city }}</p>
      </div>
    </div>
    <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ provider.description || 'Sin descripción' }}</p>
    <div class="flex items-center justify-between">
      <div class="flex gap-1 flex-wrap">
        <span
          v-for="cat in provider.categories?.slice(0, 2)"
          :key="cat"
          class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
        >{{ cat }}</span>
      </div>
      <div class="flex items-center gap-1 text-sm shrink-0">
        <span class="text-yellow-400">★</span>
        <span class="font-medium">{{ provider.rating?.average || 0 }}</span>
        <span class="text-gray-400">({{ provider.rating?.count || 0 }})</span>
      </div>
    </div>
    <span
      :class="provider.availability === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
      class="mt-3 text-xs px-2 py-1 rounded-full inline-block"
    >
      {{ provider.availability === 'available' ? '● Disponible' : provider.availability }}
    </span>
  </div>
</template>
