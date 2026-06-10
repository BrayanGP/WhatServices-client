<script setup>
import { ref } from 'vue'
import footerPhone from '../assets/logoFooter.png'

const currentYear = ref(new Date().getFullYear())
</script>

<template>
  <footer class="bg-brand-dark text-gray-300 pt-12 pb-6 border-t border-brand-green/20">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-8 items-start">

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
          <li><router-link to="/terminos" class="hover:text-brand-lightGreen transition-colors">Términos de Servicio</router-link></li>
          <li><router-link to="/privacidad" class="hover:text-brand-lightGreen transition-colors">Política de Privacidad</router-link></li>
        </ul>
      </div>

      <!-- Redes sociales -->
      <div>
        <h3 class="text-white font-bold text-sm uppercase tracking-wider mb-4">Síguenos</h3>
        <ul class="flex flex-col gap-3 text-sm">

          <!-- WhatsApp -->
          <li>
            <a href="https://wa.me/525657315638" target="_blank" rel="noopener"
              class="flex items-center gap-2 hover:text-brand-lightGreen transition-colors">
              <svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 0 0 .915.915l5.573-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.676.97.982-3.584-.231-.368A9.694 9.694 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
              WhatsApp
            </a>
          </li>

          <!-- Instagram -->
          <li>
            <a href="https://www.instagram.com/whatservicesmx/" target="_blank" rel="noopener"
              class="flex items-center gap-2 hover:text-brand-lightGreen transition-colors">
              <svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </a>
          </li>

          <!-- Facebook -->
          <li>
            <a href="https://www.facebook.com/share/18TTWWUSR3/?mibextid=wwXIfr" target="_blank" rel="noopener"
              class="flex items-center gap-2 hover:text-brand-lightGreen transition-colors">
              <svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
              Facebook
            </a>
          </li>

          <!-- TikTok -->
          <li>
            <a href="https://www.tiktok.com/@whatservicesmx?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener"
              class="flex items-center gap-2 hover:text-brand-lightGreen transition-colors">
              <svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
              </svg>
              TikTok
            </a>
          </li>

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
