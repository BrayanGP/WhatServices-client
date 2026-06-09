import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/providers', component: () => import('../views/ProviderListView.vue'), meta: { publicOnly: true } },
  { path: '/providers/:id', component: () => import('../views/ProviderDetailView.vue') },
  { path: '/login', component: () => import('../views/LoginView.vue') },
  // El registro web es solo para profesionales
  { path: '/register', redirect: '/unete' },
  { path: '/unete', component: () => import('../views/EmployeeRegisterView.vue') },
  { path: '/mi-perfil', component: () => import('../views/MyProfileView.vue') },
  { path: '/terminos', component: () => import('../views/TermsView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' }),
})

// Un profesional logueado no debe ver el listado de otros prestadores
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.publicOnly && auth.isLoggedIn) return '/mi-perfil'
})

export default router
