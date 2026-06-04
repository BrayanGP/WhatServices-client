import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/providers', component: () => import('../views/ProviderListView.vue') },
  { path: '/providers/:id', component: () => import('../views/ProviderDetailView.vue') },
  { path: '/login', component: () => import('../views/LoginView.vue') },
  // El registro web es solo para profesionales
  { path: '/register', redirect: '/unete' },
  { path: '/unete', component: () => import('../views/EmployeeRegisterView.vue') },
  { path: '/mi-perfil', component: () => import('../views/MyProfileView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
