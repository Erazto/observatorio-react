async function read(resource, filters = {}) {
  const response = await fetch(`/api/education?${new URLSearchParams({ resource, ...filters })}`, { cache: 'no-store' })
  if (response.status === 401) {
    window.location.assign('/auth/login')
    throw new Error('Tu sesión terminó. Inicia sesión de nuevo.')
  }
  if (!response.ok) throw new Error('No se pudieron cargar los datos.')
  return response.json()
}
export const getDashboardSeries = () => read('dashboard')
export const getMunicipalDataByCycle = cycle => read('municipal', { cycle })
export const getLevelMunicipalData = cycle => read('levels', { cycle })
export const getSchoolHistory = cct => read('school', { cct })
