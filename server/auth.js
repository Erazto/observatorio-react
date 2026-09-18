import { createClient } from '@supabase/supabase-js'

const COOKIE = '__Host-observatorio'
// app_metadata is managed by administrators, never by the account holder.
const hasAccess = user => user?.app_metadata?.observatorio_access === true
const forbidden = () => json({ error: 'Tu cuenta no tiene acceso al Observatorio.' }, 403)
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }
const cookie = (value, age) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`
const redirect = (location, sessionCookie) => new Response(null, { status: 303, headers: { ...headers, Location: location, ...(sessionCookie ? { 'Set-Cookie': sessionCookie } : {}) } })
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

function login(message = '', status = 200) {
  return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Iniciar sesión | Observatorio Educativo</title><style>*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#303030;font:16px system-ui;min-height:100svh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:440px;background:white;padding:36px;border:1px solid #e4dfd7;border-radius:16px}h1{font-size:28px}p{line-height:1.6;color:#606060}label{display:block;margin:20px 0 8px}input,button{width:100%;padding:13px;font:inherit;border-radius:6px;border:1px solid #aaa}button{margin-top:24px;background:#9f2241;color:white;border:0;cursor:pointer}:focus-visible{outline:3px solid #b38b3a;outline-offset:3px}.error{color:#9f2241}</style><main><p>Observatorio Educativo<br>Estado de México</p><h1>Iniciar sesión</h1><p>Ingresa con tu cuenta autorizada.</p>${message ? `<p class="error" role="alert">${message}</p>` : ''}<form action="/auth/login" method="post"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button>Entrar al Observatorio</button></form><p>Para solicitar acceso o restablecer tu contraseña, contacta a la administración del Observatorio.</p></main></html>`, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } })
}

export async function protect(context, makeClient = createClient) {
  const { request, env } = context
  const url = new URL(request.url)
  const mutating = !['GET', 'HEAD'].includes(request.method)
  if (mutating && request.headers.get('Origin') !== url.origin) return json({ error: 'Origen no permitido' }, 403)
  if (url.pathname === '/auth/logout') {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
    return redirect('/auth/login', cookie('', 0))
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return login('El acceso aún no está configurado. Intenta más tarde.', 503)
  const token = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  const client = makeClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: token ? { Authorization: `Bearer ${token}` } : {} } })
  try {
    if (url.pathname === '/auth/login') {
      if (request.method === 'GET') return login()
      if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
      if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return json({ error: 'Formato no permitido' }, 415)
      const raw = await request.text()
      if (raw.length > 8192) return json({ error: 'Solicitud demasiado grande' }, 413)
      const form = new URLSearchParams(raw)
      const email = form.get('email')?.trim(), password = form.get('password')
      if (!email || !password || email.length > 254 || password.length > 1024) return login('Ingresa tu correo y contraseña.', 400)
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data.session) return login('No se pudo iniciar sesión. Revisa tus credenciales o intenta más tarde.', 401)
      if (!hasAccess(data.user)) return login('Tu cuenta no tiene acceso al Observatorio. Contacta a la administración.', 403)
      return redirect('/', cookie(data.session.access_token, Math.min(data.session.expires_in, 3600)))
    }
    if (!token) return denied(request)
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return denied(request)
    if (!hasAccess(data.user)) return forbidden()
    context.data.user = data.user
    context.data.supabase = client
    const response = await context.next()
    const result = new Response(response.body, response)
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value)
    return result
  } catch {
    return json({ error: 'No se pudo verificar el acceso. Intenta más tarde.' }, 503)
  }
}
function denied(request) {
  return request.headers.get('Accept')?.includes('text/html') && ['GET', 'HEAD'].includes(request.method)
    ? redirect('/auth/login', cookie('', 0))
    : json({ error: 'Inicia sesión para continuar' }, 401)
}
