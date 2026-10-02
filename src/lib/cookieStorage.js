// Almacenamiento de la sesión en cookies.
//
// Implementa la misma interfaz que localStorage (getItem / setItem /
// removeItem) que espera el cliente de autenticación de supabase-js, así
// el inicio de sesión se conserva en cookies en vez de localStorage.
//
// Una cookie escrita desde JavaScript tiene un límite de ~4 KB y la
// sesión completa de Supabase (con access token, refresh token y los
// datos del usuario) puede superarlo, así que los valores se parten en
// varios fragmentos: `clave`, `clave.1`, `clave.2`…

const MAX_TAMANO = 3600 // caracteres por fragmento (deja margen al límite de 4 KB)
const UN_ANO_MS = 365 * 24 * 60 * 60 * 1000

function escribirCookie(nombre, valorCodificado) {
  const expira = new Date(Date.now() + UN_ANO_MS).toUTCString()
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${nombre}=${valorCodificado}; expires=${expira}; path=/; SameSite=Lax${secure}`
}

function borrarCookie(nombre) {
  document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

function leerCookie(nombre) {
  for (const parte of document.cookie ? document.cookie.split('; ') : []) {
    const igual = parte.indexOf('=')
    if (igual > -1 && parte.slice(0, igual) === nombre) {
      return parte.slice(igual + 1)
    }
  }
  return null
}

// Nombres de todos los fragmentos de una clave: clave, clave.1, clave.2…
function fragmentosDe(clave) {
  const nombres = [clave]
  for (let i = 1; leerCookie(`${clave}.${i}`) !== null; i++) nombres.push(`${clave}.${i}`)
  return nombres
}

export const cookieStorage = {
  getItem(clave) {
    if (leerCookie(clave) === null) return null
    const crudo = fragmentosDe(clave).map(leerCookie).join('')
    try {
      return decodeURIComponent(crudo)
    } catch {
      return null // cookie corrupta: se ignora como si no existiera
    }
  },

  setItem(clave, valor) {
    // Se limpian los fragmentos anteriores por si el valor bajó de tamaño
    fragmentosDe(clave).forEach(borrarCookie)

    // Se codifica completo y luego se parte: el texto codificado es ASCII
    // puro, así que cortar por caracteres nunca rompe tildes ni emojis
    const codificado = encodeURIComponent(String(valor))
    for (let i = 0, indice = 0; i < codificado.length; i += MAX_TAMANO, indice++) {
      escribirCookie(indice === 0 ? clave : `${clave}.${indice}`, codificado.slice(i, i + MAX_TAMANO))
    }
  },

  removeItem(clave) {
    fragmentosDe(clave).forEach(borrarCookie)
  },
}
