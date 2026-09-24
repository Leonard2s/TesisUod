<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabaseClient'
import AppNavbar from './components/AppNavbar.vue'

const session = ref(null)
const router = useRouter()

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session

  supabase.auth.onAuthStateChange((_event, nuevaSession) => {
    session.value = nuevaSession
    if (!nuevaSession) router.push({ name: 'login' })
  })
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 font-sans text-slate-800 antialiased">
    <AppNavbar v-if="session" :email="session.user?.email ?? ''" />
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
