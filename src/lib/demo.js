// Backend de demostración para desarrollo.
// Se activa cuando no hay credenciales reales de Supabase configuradas
// (o forzado con VITE_MODO_DEMO=true). La sesión se guarda en cookies y
// las encuestas nuevas en localStorage, así que sobreviven a las recargas.

import { cookieStorage } from './cookieStorage'

const COOKIE_SESION = 'tesis-uod-sesion'
const LS_ENCUESTAS = 'tesis-uod:encuestas'
const LS_PREGUNTAS = 'tesis-uod:preguntas'
const LS_USUARIOS = 'tesis-uod:usuarios'
const LS_ACCESOS = 'tesis-uod:accesos'
const LS_AUDITORIA = 'tesis-uod:auditoria'
const LS_LISTA_USUARIOS = 'tesis-uod:lista-usuarios'

// Las 8 preguntas del cuestionario (igual que el seed de Supabase)
const PREGUNTAS_SEMILLA = [
  {
    id: 1, clave: 'frecuencia_automedicacion', titulo: '¿Con qué frecuencia se automedica?',
    etiqueta: 'Frecuencia de automedicación', tipo: 'unica',
    opciones: ['Rara vez', 'Frecuentemente', 'Nunca'], orden: 1,
  },
  {
    id: 2, clave: 'rango_edad', titulo: '¿Qué edad tienes?',
    etiqueta: 'Rango de edad', tipo: 'unica',
    opciones: ['De 18 a 29 años', 'De 30 a 39 años', 'De 40 a 49 años', 'De 50 a 59 años', 'De 60 años o más'],
    orden: 2,
  },
  {
    id: 3, clave: 'genero', titulo: 'Género',
    etiqueta: 'Género', tipo: 'unica',
    opciones: ['Mujer', 'Hombre'], orden: 3,
  },
  {
    id: 4, clave: 'antibioticos', titulo: '¿Con cuál o cuáles antibióticos se ha automedicado?',
    etiqueta: 'Antibióticos usados', tipo: 'multiple',
    opciones: ['Azitromicina', 'Amoxicilina', 'Cefalexina', 'Metronidazol'], orden: 4,
  },
  {
    id: 5, clave: 'sintomas', titulo: '¿Cuáles de los siguientes síntomas ha notado?',
    etiqueta: 'Síntomas notados', tipo: 'multiple',
    opciones: ['Sangrado', 'Inflamación', 'Movilidad dental', 'Sarro', 'Dolor'], orden: 5,
  },
  {
    id: 6, clave: 'grado_educacion', titulo: '¿Cuál es su grado de educación?',
    etiqueta: 'Grado de educación', tipo: 'unica',
    opciones: ['Nivel primario', 'Nivel secundario', 'Universitario', 'Especialidad'], orden: 6,
  },
  {
    id: 7, clave: 'lugar_residencia', titulo: '¿Cuál es su lugar de residencia?',
    etiqueta: 'Lugar de residencia', tipo: 'unica',
    opciones: [
      'Pueblo de una provincia', 'Campo de una provincia', 'Urbanización',
      'Ciudad de la capital', 'Barrio', 'Residencial',
    ],
    orden: 7,
  },
  {
    id: 8, clave: 'motivo_automedicacion', titulo: '¿Por qué se automedica?',
    etiqueta: 'Motivo de automedicación', tipo: 'unica',
    opciones: ['Recomendación de tercera persona', 'Falta de tiempo para ir a consulta', 'Por prevención'],
    orden: 8,
  },
].map((p) => ({
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  deleted_by_nombre: null,
  deleted_by_matricula: null,
  ...p,
}))

function cargarPreguntasDemo() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(LS_PREGUNTAS) || 'null')
    if (Array.isArray(guardadas) && guardadas.length) return guardadas
  } catch {
    // localStorage corrupto: se reinicia con la semilla
  }
  return [...PREGUNTAS_SEMILLA]
}

function guardarPreguntasDemo(preguntas) {
  localStorage.setItem(LS_PREGUNTAS, JSON.stringify(preguntas))
}

// Historial de accesos para la pantalla de auditoría
const ACCESOS_SEMILLA = [
  {
    id: 1, correo: 'demo@tesis-uod.local', nombre: 'Encuestadora Demo', matricula: 'demo-01',
    inicio: '2026-09-29T08:30:00Z', fin: '2026-09-29T12:45:00Z',
  },
  {
    id: 2, correo: 'ayudante@tesis-uod.local', nombre: 'Ayudante Demo', matricula: 'demo-02',
    inicio: '2026-09-30T09:05:00Z', fin: null,
  },
  {
    id: 3, correo: 'demo@tesis-uod.local', nombre: 'Encuestadora Demo', matricula: 'demo-01',
    inicio: '2026-10-01T15:10:00Z', fin: null,
  },
].map((a) => ({ created_at: a.inicio, ...a }))

function cargarAccesos() {
  try {
    const guardados = JSON.parse(localStorage.getItem(LS_ACCESOS) || 'null')
    if (Array.isArray(guardados)) return guardados
  } catch {
    // localStorage corrupto: se reinicia con la semilla
  }
  return [...ACCESOS_SEMILLA]
}

function guardarAccesos(accesos) {
  localStorage.setItem(LS_ACCESOS, JSON.stringify(accesos))
}

// Actividad de ejemplo para la pestaña Actividad (auditoría de acciones)
const AUDITORIA_SEMILLA = [
  {
    id: 1, correo: 'demo@tesis-uod.local', nombre: 'Encuestadora Demo', matricula: 'demo-01',
    accion: 'pregunta_editada', detalle: 'Editó la pregunta «Género»',
    created_at: '2026-10-01T16:20:00Z',
  },
  {
    id: 2, correo: 'demo@tesis-uod.local', nombre: 'Encuestadora Demo', matricula: 'demo-01',
    accion: 'encuesta_creada', detalle: 'Registró una respuesta de la encuesta',
    created_at: '2026-10-01T17:05:00Z',
  },
  {
    id: 3, correo: 'ayudante@tesis-uod.local', nombre: 'Ayudante Demo', matricula: 'demo-02',
    accion: 'exportacion', detalle: 'Exportó los datos a PDF',
    created_at: '2026-10-01T18:30:00Z',
  },
]

function cargarAuditoria() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(LS_AUDITORIA) || 'null')
    if (Array.isArray(guardadas)) return guardadas
  } catch {
    // localStorage corrupto: se reinicia con la semilla
  }
  return [...AUDITORIA_SEMILLA]
}

function guardarAuditoria(auditoria) {
  localStorage.setItem(LS_AUDITORIA, JSON.stringify(auditoria))
}

// Usuarios registrados de ejemplo (en la app real los sincroniza un
// trigger desde Supabase Auth)
const LISTA_USUARIOS_SEMILLA = [
  {
    id: 'u-demo-1', correo: 'demo@tesis-uod.local', nombre: 'Encuestadora Demo',
    matricula: 'demo-01', created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'u-demo-2', correo: 'ayudante@tesis-uod.local', nombre: 'Ayudante Demo',
    matricula: 'demo-02', created_at: '2026-09-05T09:00:00Z',
  },
]

function cargarListaUsuarios() {
  try {
    const guardados = JSON.parse(localStorage.getItem(LS_LISTA_USUARIOS) || 'null')
    if (Array.isArray(guardados)) return guardados
  } catch {
    // localStorage corrupto: se reinicia con la semilla
  }
  return [...LISTA_USUARIOS_SEMILLA]
}

function guardarListaUsuarios(usuarios) {
  localStorage.setItem(LS_LISTA_USUARIOS, JSON.stringify(usuarios))
}

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
  // respuestas en el formato nuevo (jsonb): { clave: [valores] }
  respuestas: {
    frecuencia_automedicacion: [e.frecuencia_automedicacion],
    rango_edad: [e.rango_edad],
    genero: [e.genero],
    antibioticos: [...e.antibioticos],
    sintomas: [...e.sintomas],
    grado_educacion: [e.grado_educacion],
    lugar_residencia: [e.lugar_residencia],
    motivo_automedicacion: [e.motivo_automedicacion],
  },
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

function crearAuth({ listaUsuarios = [], persistirLista = null } = {}) {
  const listeners = new Set()
  let sesion = null
  try {
    sesion = JSON.parse(cookieStorage.getItem(COOKIE_SESION) || 'null')
  } catch {
    sesion = null
  }

  const notificar = (evento) => listeners.forEach((cb) => cb(evento, sesion))

  // Refleja un usuario en la lista de registrados (como el trigger de
  // Supabase Auth en la app real)
  const reflejarEnLista = (user) => {
    const meta = user?.user_metadata ?? {}
    const existente = listaUsuarios.find((u) => u.correo === user.email)
    if (existente) {
      existente.nombre =
        [meta.nombre, meta.apellido].filter(Boolean).join(' ') || existente.nombre
      existente.matricula = meta.matricula || existente.matricula
    } else {
      listaUsuarios.push({
        id: 'u-' + (user.email || Math.random()).replace(/[^a-z0-9]/gi, ''),
        correo: user.email,
        nombre: [meta.nombre, meta.apellido].filter(Boolean).join(' ') || null,
        matricula: meta.matricula || null,
        created_at: new Date().toISOString(),
      })
    }
    persistirLista?.(listaUsuarios)
  }

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
      reflejarEnLista(user)
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
      cookieStorage.setItem(COOKIE_SESION, JSON.stringify(sesion))
      notificar('SIGNED_IN')
      return { data: { session: sesion }, error: null }
    },
    // Actualiza los datos del usuario (perfil) y su contraseña, como
    // el updateUser de Supabase
    async updateUser({ password, data } = {}) {
      if (!sesion) {
        return { data: { user: null }, error: { message: 'No hay sesión activa' } }
      }
      const usuarios = cargarUsuarios()
      const registrado = usuarios[sesion.user.email]
      const user = registrado?.user || sesion.user
      if (data) user.user_metadata = { ...(user.user_metadata || {}), ...data }
      if (password && registrado) {
        usuarios[sesion.user.email] = { password, user }
        guardarUsuarios(usuarios)
      }
      sesion.user = user
      cookieStorage.setItem(COOKIE_SESION, JSON.stringify(sesion))
      reflejarEnLista(user)
      notificar('USER_UPDATED')
      return { data: { user }, error: null }
    },
    async signOut() {
      sesion = null
      cookieStorage.removeItem(COOKIE_SESION)
      notificar('SIGNED_OUT')
      return { error: null }
    },
  }
}

function crearConsulta(datos, { persistir = null, siguienteId = { valor: 1 } } = {}) {
  const ordenes = []
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
      ordenes.push({ columna, ascending })
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
      if (ordenes.length) {
        res = [...res].sort((a, b) => {
          for (const { columna, ascending } of ordenes) {
            if (a[columna] === b[columna]) continue
            const menor = a[columna] < b[columna]
            return (menor ? -1 : 1) * (ascending ? 1 : -1)
          }
          return 0
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
  const preguntas = cargarPreguntasDemo()
  const siguienteIdPregunta = {
    valor: Math.max(0, ...preguntas.map((p) => p.id ?? 0)) + 1,
  }
  const accesos = cargarAccesos()
  const siguienteIdAcceso = {
    valor: Math.max(0, ...accesos.map((a) => a.id ?? 0)) + 1,
  }
  const auditoria = cargarAuditoria()
  const siguienteIdAuditoria = {
    valor: Math.max(0, ...auditoria.map((a) => a.id ?? 0)) + 1,
  }
  const listaUsuarios = cargarListaUsuarios()

  return {
    auth: crearAuth({ listaUsuarios, persistirLista: guardarListaUsuarios }),
    from(tabla) {
      if (tabla === 'encuestas') {
        return crearConsulta(encuestas, { persistir: guardarEncuestas, siguienteId })
      }
      if (tabla === 'preguntas') {
        return crearConsulta(preguntas, {
          persistir: guardarPreguntasDemo,
          siguienteId: siguienteIdPregunta,
        })
      }
      if (tabla === 'sesiones') {
        return crearConsulta(accesos, {
          persistir: guardarAccesos,
          siguienteId: siguienteIdAcceso,
        })
      }
      if (tabla === 'auditoria') {
        return crearConsulta(auditoria, {
          persistir: guardarAuditoria,
          siguienteId: siguienteIdAuditoria,
        })
      }
      if (tabla === 'usuarios') {
        return crearConsulta(listaUsuarios, { persistir: guardarListaUsuarios })
      }
      return crearConsulta([])
    },
  }
}
