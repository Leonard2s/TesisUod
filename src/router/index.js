import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabaseClient'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/registro',
    name: 'registro',
    component: () => import('../views/RegistroView.vue'),
    meta: { public: true },
  },
  {
    path: '/datos',
    name: 'datos',
    component: () => import('../views/DatosView.vue'),
  },
  {
    path: '/estadisticas',
    name: 'estadisticas',
    component: () => import('../views/EstadisticasView.vue'),
  },
  {
    path: '/papelera',
    name: 'papelera',
    component: () => import('../views/PapeleraView.vue'),
  },
  { path: '/', redirect: '/datos' },
  { path: '/:pathMatch(.*)*', redirect: '/datos' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session && !to.meta.public) return { name: 'login' }
  if (session && (to.name === 'login' || to.name === 'registro')) {
    return { name: 'datos' }
  }
})

export default router
