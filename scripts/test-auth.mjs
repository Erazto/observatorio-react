import assert from 'node:assert/strict'
import { protect } from '../server/auth.js'
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-key' }
let calls = 0
const users = {
  valid: { id: 'user', app_metadata: { observatorio_access: true } },
  seem: { id: 'seem-user', app_metadata: { seem_access: true } },
  selfGranted: { id: 'other', user_metadata: { observatorio_access: true } },
  revoked: { id: 'revoked', app_metadata: { observatorio_access: false } },
  stringFlag: { id: 'string', app_metadata: { observatorio_access: 'true' } },
}
const client = () => ({ auth: {
  getUser: async token => ({ data: { user: users[token] || null }, error: !users[token] }),
  signInWithPassword: async ({ password }) => ({ data: { user: password === 'correct' ? users.valid : users.seem, session: ['correct', 'seem'].includes(password) ? { access_token: 'valid', expires_in: 3600 } : null }, error: !['correct', 'seem'].includes(password) }),
} })
async function run(path, options = {}, bindings = env) {
  return protect({ request: new Request(`https://observatorio.test${path}`, options), env: bindings, data: {}, next: async () => { calls++; return new Response('private content') } }, client)
}
for (const path of ['/', '/assets/app.js', '/BD_municipios.xlsx', '/documentos/file.pdf', '/api/education']) {
  assert.equal((await run(path)).status, 401)
  assert.equal((await run(path, { headers: { Cookie: '__Host-observatorio=forged' } })).status, 401)
}
assert.equal(calls, 0)
assert.equal((await run('/', { headers: { Accept: 'text/html' } })).headers.get('Location'), '/auth/login')
assert.equal((await run('/auth/login')).status, 200)
assert.equal((await run('/', {}, {})).status, 503)
const post = password => ({ method: 'POST', headers: { Origin: 'https://observatorio.test', 'Content-Type': 'application/x-www-form-urlencoded' }, body: `email=user%40example.com&password=${password}` })
assert.equal((await run('/auth/login', post('bad'))).status, 401)
const signed = await run('/auth/login', post('correct'))
assert.equal(signed.status, 303)
assert.match(signed.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/)
assert.equal((await run('/auth/login', { ...post('correct'), headers: { Origin: 'https://evil.test' } })).status, 403)
const allowed = await run('/BD_municipios.xlsx', { headers: { Cookie: '__Host-observatorio=valid' } })
assert.equal(await allowed.text(), 'private content')
assert.equal(allowed.headers.get('Cache-Control'), 'private, no-store')
assert.equal((await run('/auth/logout')).status, 405)
assert.match((await run('/auth/logout', post(''))).headers.get('Set-Cookie'), /Max-Age=0/)
console.log('OK: acceso anónimo, token inválido, archivos, API, login, cookies, CSRF, cierre y configuración ausente.')

const before = calls
for (const token of ['seem', 'selfGranted', 'revoked', 'stringFlag']) {
  for (const path of ['/', '/assets/app.js', '/BD_municipios.xlsx', '/api/education']) {
    assert.equal((await run(path, { headers: { Cookie: `__Host-observatorio=${token}` } })).status, 403)
  }
}
assert.equal(calls, before, 'Usuarios sin permiso no deben alcanzar archivos ni API')
const refused = await run('/auth/login', post('seem'))
assert.equal(refused.status, 403)
assert.equal(refused.headers.get('Set-Cookie'), null)
console.log('OK: permisos separados, revocación, tipo estricto y rechazo de permisos editables por el usuario.')
