import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/providers', component: () => import('../views/ProviderListView.vue') },
  { path: '/providers/:id', component: () => import('../views/ProviderDetailView.vue') },
  { path: '/login', component: () => import('../views/LoginView.vue') },
  { path: '/register', component: () => import('../views/RegisterView.vue') },
  { path: '/unete', component: () => import('../views/EmployeeRegisterView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
