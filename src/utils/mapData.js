export const normalizeMunicipality = (value = '') => String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toUpperCase()
export const parseMapNumber = value => {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null
  const number = Number(String(value).trim().replace(/,/g, ''))
  return Number.isFinite(number) ? number : null
}
export function inspectMapGrid(grid) {
  if (grid.length < 2) throw new Error('El archivo debe incluir encabezados y datos municipales.')
  const headers = grid[0].map(value => String(value ?? '').trim())
  const names = headers.map(normalizeMunicipality)
  const nombre = names.indexOf('NOMBRE_DEL_MUNICIPIO')
  const cve = names.indexOf('CVE_MUN')
  if (nombre < 0) throw new Error('No se encontró la columna NOMBRE DEL MUNICIPIO.')
  const used = new Set()
  for (const row of grid.slice(1)) {
    const key = normalizeMunicipality(row[nombre] ?? '')
    if (!key) continue
    if (used.has(key)) throw new Error(`Municipio repetido: ${row[nombre]}. Conserva una fila por municipio.`)
    used.add(key)
  }
  const metrics = headers.map((name, idx) => ({ name, idx })).filter(column => column.idx !== nombre && column.idx !== cve && column.name && grid.slice(1).some(row => normalizeMunicipality(row[nombre] ?? '') && parseMapNumber(row[column.idx]) !== null))
  if (!metrics.length) throw new Error('No se encontraron indicadores numéricos con municipios.')
  if (new Set(metrics.map(c => normalizeMunicipality(c.name))).size !== metrics.length) throw new Error('Los indicadores deben tener encabezados distintos.')
  return { metrics, nombre, cve }
}
