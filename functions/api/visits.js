const reply = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})
export async function onRequest({ request, env }) {
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Método no permitido' }, 405)
  if (request.method === 'POST' && request.headers.get('Origin') !== new URL(request.url).origin) {
    return reply({ error: 'Origen no permitido' }, 403)
  }
  if (!env.VISITS_DB) return reply({ error: 'Contador no configurado' }, 503)
  try {
    const sql = request.method === 'POST'
      ? "UPDATE site_counters SET total = total + 1 WHERE name = 'visits' RETURNING total"
      : "SELECT total FROM site_counters WHERE name = 'visits'"
    const row = await env.VISITS_DB.prepare(sql).first()
    if (!row) return reply({ error: 'Contador no inicializado' }, 503)
    return reply({ total: row.total })
  } catch {
    return reply({ error: 'Contador no disponible' }, 503)
  }
}
