import { json } from '../../server/auth.js'
export async function onRequestGet({ request, data }) {
  const params = new URL(request.url).searchParams
  const client = data.supabase
  let query
  switch (params.get('resource')) {
    case 'dashboard': query = client.from('v_dashboard_estado_serie').select('*').order('ciclo'); break
    case 'municipal': query = client.from('v_mapa_municipios_serie').select('*').eq('ciclo', params.get('cycle')).order('nombre'); break
    case 'levels': query = client.from('v_nivel_municipio_serie').select('*').eq('ciclo', params.get('cycle')).order('orden_display'); break
    case 'school': query = client.from('v_ficha_cct').select('escuela_id,cv_cct,cv_cct_turno,turno,nombre,control,subsistema,nivel,subnivel,municipio,alumnos_total,docentes_total,grupos_total,aulas_en_uso_total,tiene_dato_grupos,tiene_dato_aulas,ciclo').eq('cv_cct', (params.get('cct') || '').trim().toUpperCase()).order('ciclo', { ascending: false }); break
    default: return json({ error: 'Consulta no válida' }, 400)
  }
  const { data: rows, error } = await query
  return error ? json({ error: 'No se pudieron cargar los datos' }, 502) : json(rows ?? [])
}
