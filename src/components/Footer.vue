<script setup>
import { ref } from 'vue'
import footerPhone from '../assets/logoFooter.png'

const currentYear = ref(new Date().getFullYear())
</script>

<template>
  <footer class="bg-brand-dark text-gray-300 pt-12 pb-6 border-t border-brand-green/20">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 items-start">

      <!-- Marca -->
      <div class="flex flex-col gap-4 text-left">
        <h3 class="text-white font-bold text-lg tracking-wide mb-1">WhatServices</h3>
        <p class="text-sm text-gray-400 max-w-xs">
          Conectamos a los mejores profesionales locales con soluciones rápidas y garantizadas directamente en tu ciudad.
        </p>
      </div>

      <!-- Plataforma -->
      <div class="md:pl-4">
        <h3 class="text-white font-bold text-sm uppercase tracking-wider mb-4">Plataforma</h3>
        <ul class="flex flex-col gap-2.5 text-sm">
          <li><router-link to="/" class="hover:text-brand-lightGreen transition-colors">Inicio</router-link></li>
          <li><router-link to="/providers" class="hover:text-brand-lightGreen transition-colors">Profesionales</router-link></li>
          <li><router-link to="/unete" class="hover:text-brand-lightGreen transition-colors">Únete</router-link></li>
        </ul>
      </div>

      <!-- Soporte -->
      <div>
        <h3 class="text-white font-bold text-sm uppercase tracking-wider mb-4">Soporte</h3>
        <ul class="flex flex-col gap-2.5 text-sm">
          <li><a href="#" class="hover:text-brand-lightGreen transition-colors">Términos de Servicio</a></li>
          <li><a href="#" class="hover:text-brand-lightGreen transition-colors">Política de Privacidad</a></li>
          <li><a href="#" class="hover:text-brand-lightGreen transition-colors">Contacto</a></li>
        </ul>
      </div>

      <!-- Imagen -->
      <div class="flex flex-col items-center md:items-end justify-start w-full">
        <router-link to="/" class="block">
          <img
            :src="footerPhone"
            alt="WhatServices WhatsApp Chat"
            class="w-full max-w-[240px] rounded-xl shadow-lg border border-white/10 object-contain block"
          />
        </router-link>
      </div>

    </div>

    <div class="max-w-6xl mx-auto px-4 mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
      <p>&copy; {{ currentYear }} WhatServices. Todos los derechos reservados.</p>
      <p class="flex items-center gap-1">
        Desarrollado con <span class="text-brand-lightGreen">♥</span> para tu comunidad.
      </p>
    </div>
  </footer>
</template>
