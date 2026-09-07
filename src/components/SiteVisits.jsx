import React, { useEffect, useState } from 'react'

// Una petición por carga de la página, incluso con los efectos dobles de StrictMode.
let visitRequest
function recordVisit() {
  if (!visitRequest) {
    visitRequest = fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(async response => {
        if (!response.ok) throw new Error('Contador no disponible')
        const data = await response.json()
        if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Respuesta inválida')
        return data.total
      })
  }
  return visitRequest
}
export default function SiteVisits() {
  const [total, setTotal] = useState(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    let active = true
    recordVisit().then(value => { if (active) setTotal(value) }).catch(() => { if (active) setUnavailable(true) })
    return () => { active = false }
  }, [])
  return <p className="site-visits" role="status">
    Visitas generales: <strong>{unavailable ? 'No disponible' : total === null ? 'Cargando…' : total.toLocaleString('es-MX')}</strong>
    <small> Cargas del sitio desde la activación del contador; no visitantes únicos.</small>
  </p>
}
