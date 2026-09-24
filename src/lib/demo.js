// Backend de demostración para desarrollo.
// Se activa cuando no hay credenciales reales de Supabase configuradas
// (o forzado con VITE_MODO_DEMO=true). La sesión y las encuestas nuevas
// se guardan en localStorage, así que sobreviven a las recargas.

const LS_SESION = 'tesis-uod:sesion'
const LS_ENCUESTAS = 'tesis-uod:encuestas'
const LS_USUARIOS = 'tesis-uod:usuarios'

const ENCUESTAS_SEMILLA = [
  {
    id: 1, created_at: '2026-09-01T10:00:00Z',
    frecuencia_automedicacion: 'Rara vez', rango_edad: 'De 18 a 29 años', genero: 'Mujer',
    antibioticos: ['Amoxicilina'], sintomas: ['Dolor', 'Sarro'],
    grado_educacion: 'Universitario', lugar_residencia: 'Ciudad de la capital',
    motivo_automedicacion: 'Falta de tiempo para ir a consulta',
  },
  {
    id: 2, created_at: '2026-09-02T11:30:00Z',
    frecuencia_automedicacion: 'Frecuentemente', rango_edad: 'De 40 a 49 años', genero: 'Hombre',
    antibioticos: ['Azitromicina', 'Metronidazol'], sintomas: ['Inflamación', 'Dolor'],
    grado_educacion: 'Nivel secundario', lugar_residencia: 'Barrio',
    motivo_automedicacion: 'Recomendación de tercera persona',
  },
  {
    id: 3, created_at: '2026-09-03T09:15:00Z',
    frecuencia_automedicacion: 'Nunca', rango_edad: 'De 60 años o más', genero: 'Mujer',
    antibioticos: [], sintomas: ['Sangrado'],
    grado_educacion: 'Nivel primario', lugar_residencia: 'Campo de una provincia',
    motivo_automedicacion: 'Por prevención',
  },
  {
    id: 4, created_at: '2026-09-05T14:00:00Z',
    frecuencia_automedicacion: 'Rara vez', rango_edad: 'De 30 a 39 años', genero: 'Mujer',
    antibioticos: ['Amoxicilina', 'Cefalexina'], sintomas: ['Sarro'],
    grado_educacion: 'Universitario', lugar_residencia: 'Urbanización',
    motivo_automedicacion: 'Falta de tiempo para ir a consulta',
  },
  {
    id: 5, created_at: '2026-09-08T16:45:00Z',
    frecuencia_automedicacion: 'Frecuentemente', rango_edad: 'De 50 a 59 años', genero: 'Hombre',
    antibioticos: ['Metronidazol'], sintomas: ['Dolor', 'Movilidad dental'],
    grado_educacion: 'Nivel secundario', lugar_residencia: 'Pueblo de una provincia',
    motivo_automedicacion: 'Recomendación de tercera persona',
  },
  {
    id: 6, created_at: '2026-09-10T08:30:00Z',
    frecuencia_automedicacion: 'Rara vez', rango_edad: 'De 18 a 29 años', genero: 'Hombre',
    antibioticos: ['Azitromicina'], sintomas: ['Inflamación'],
    grado_educacion: 'Especialidad', lugar_residencia: 'Residencial',
    motivo_automedicacion: 'Por prevención',
  },
  {
    id: 7, created_at: '2026-09-12T13:20:00Z',
    frecuencia_automedicacion: 'Nunca', rango_edad: 'De 30 a 39 años', genero: 'Mujer',
    antibioticos: [], sintomas: ['Sangrado', 'Sarro'],
    grado_educacion: 'Nivel secundario', lugar_residencia: 'Barrio',
    motivo_automedicacion: 'Por prevención',
  },
  {
    id: 8, created_at: '2026-09-15T10:10:00Z',
    frecuencia_automedicacion: 'Frecuentemente', rango_edad: 'De 40 a 49 años', genero: 'Mujer',
    antibioticos: ['Amoxicilina'], sintomas: ['Dolor'],
    grado_educacion: 'Universitario', lugar_residencia: 'Ciudad de la capital',
    motivo_automedicacion: 'Falta de tiempo para ir a consulta',
  },
].map((e) => ({
  registrado_nombre: 'Encuestadora demo',
  registrado_matricula: 'demo-01',
  ...e,
}))

function cargarEncuestas() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(LS_ENCUESTAS) || 'null')
    if (Array.isArray(guardadas)) return guardadas
  } catch {
    // localStorage corrupto: se reinicia con la semilla
  }
  return [...ENCUESTAS_SEMILLA]
}

function guardarEncuestas(encuestas) {
  localStorage.setItem(LS_ENCUESTAS, JSON.stringify(encuestas))
}

function cargarUsuarios() {
  try {
    const guardados = JSON.parse(localStorage.getItem(LS_USUARIOS) || 'null')
    if (guardados && typeof guardados === 'object') return guardados
  } catch {
    // localStorage corrupto: se reinicia vacío
  }
  return {}
}

function guardarUsuarios(usuarios) {
  localStorage.setItem(LS_USUARIOS, JSON.stringify(usuarios))
}

function crearAuth() {
  const listeners = new Set()
  let sesion = null
  try {
    sesion = JSON.parse(localStorage.getItem(LS_SESION) || 'null')
  } catch {
    sesion = null
  }

  const notificar = (evento) => listeners.forEach((cb) => cb(evento, sesion))

  return {
    async getSession() {
      return { data: { session: sesion } }
    },
    onAuthStateChange(callback) {
      listeners.add(callback)
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
    },
    async signUp({ email, password, options }) {
      const usuarios = cargarUsuarios()
      if (usuarios[email]) {
        return {
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        }
      }
      const user = { email, user_metadata: options?.data || {} }
      usuarios[email] = { password, user }
      guardarUsuarios(usuarios)
      return { data: { user, session: null }, error: null }
    },
    async signInWithPassword({ email, password }) {
      // Si el correo pertenece a un usuario registrado en el demo, se
      // valida la contraseña; si no existe, se deja entrar igual (demo).
      const registrado = cargarUsuarios()[email]
      if (registrado && registrado.password !== password) {
        return {
          data: { session: null },
          error: { message: 'Invalid login credentials' },
        }
      }
      sesion = { user: registrado?.user || { email }, access_token: 'demo-token' }
      localStorage.setItem(LS_SESION, JSON.stringify(sesion))
      notificar('SIGNED_IN')
      return { data: { session: sesion }, error: null }
    },
    async signOut() {
      sesion = null
      localStorage.removeItem(LS_SESION)
      notificar('SIGNED_OUT')
      return { error: null }
    },
  }
}

function crearConsulta(datos, { persistir = null, siguienteId = { valor: 1 } } = {}) {
  let orden = null
  const filtros = []

  const coincide = (fila) =>
    filtros.every((f) => {
      if (f.tipo === 'not' && f.operador === 'is') {
        return f.valor === null ? fila[f.columna] != null : fila[f.columna] !== f.valor
      }
      return f.valor === null ? fila[f.columna] == null : fila[f.columna] === f.valor
    })

  const consulta = {
    select() {
      return consulta
    },
    is(columna, valor) {
      filtros.push({ columna, valor })
      return consulta
    },
    eq(columna, valor) {
      filtros.push({ columna, valor })
      return consulta
    },
    not(columna, operador, valor) {
      filtros.push({ tipo: 'not', columna, operador, valor })
      return consulta
    },
    order(columna, { ascending = true } = {}) {
      orden = { columna, ascending }
      return consulta
    },
    insert(fila) {
      const nuevo = {
        id: siguienteId.valor++,
        created_at: new Date().toISOString(),
        deleted_at: null,
        ...fila,
      }
      datos.push(nuevo)
      persistir?.(datos)
      return Promise.resolve({ error: null })
    },
    update(cambios) {
      return {
        eq(columna, valor) {
          datos.forEach((f) => {
            if (f[columna] === valor) Object.assign(f, cambios)
          })
          persistir?.(datos)
          return Promise.resolve({ error: null })
        },
      }
    },
    then(resolve, reject) {
      let res = datos.filter(coincide)
      if (orden) {
        const { columna, ascending } = orden
        res = [...res].sort((a, b) => {
          if (a[columna] === b[columna]) return 0
          const menor = a[columna] < b[columna]
          return (menor ? -1 : 1) * (ascending ? 1 : -1)
        })
      }
      return Promise.resolve({ data: res, error: null }).then(resolve, reject)
    },
  }
  return consulta
}

export function crearSupabaseDemo() {
  const encuestas = cargarEncuestas()
  const siguienteId = {
    valor: Math.max(0, ...encuestas.map((e) => e.id ?? 0)) + 1,
  }

  return {
    auth: crearAuth(),
    from(tabla) {
      if (tabla === 'encuestas') {
        return crearConsulta(encuestas, { persistir: guardarEncuestas, siguienteId })
      }
      return crearConsulta([])
    },
  }
}
