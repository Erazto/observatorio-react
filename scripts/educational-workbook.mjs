import fs from 'node:fs'
import XLSX from 'xlsx'
import assert from 'node:assert/strict'
const file = 'public/data/observatorio-cifras.xlsx'
const domains = ['estudiantes', 'docentes', 'escuelas']
const controls = ['estatal', 'federalizado', 'federal', 'autonomo']
function leaves(value, path = [], result = []) {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leaves(child, [...path, key], result)
  } else result.push({ ruta: JSON.stringify(path), tipo: value === null ? 'null' : typeof value, valor: value ?? '' })
  return result
}
function assign(root, path, value) {
  if (!Array.isArray(path) || !path.length || path.some(k => typeof k !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(k))) throw Error('Ruta no válida')
  let target = root
  for (let i = 0; i < path.length - 1; i++) target = target[path[i]] ??= /^\d+$/.test(path[i + 1]) ? [] : {}
  target[path.at(-1)] = value
}
function readWorkbook(book) {
  const result = {}, seen = new Set()
  const records = name => {
    if (!book.Sheets[name]) throw Error(`Falta la hoja ${name}`)
    const sheet = book.Sheets[name]
    for (const [cell, value] of Object.entries(sheet)) if (!cell.startsWith('!') && value.f) throw Error(`${name}: no se admiten fórmulas (${cell}); pega valores`)
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }
  function target(cycle, domain) {
    if (!/^\d{4}-\d{4}$/.test(cycle) || Number(cycle.slice(5)) !== Number(cycle.slice(0,4)) + 1 || !domains.includes(domain)) throw Error(`Ciclo o sección inválidos: ${cycle} / ${domain}`)
    return (result[cycle] ??= {})[domain] ??= {}
  }
  function unique(key) { if (seen.has(key)) throw Error(`Registro duplicado: ${key}`); seen.add(key) }
  for (const row of records('Niveles')) {
    const { ciclo, seccion, orden, id, nombre, macro_nivel, total, porcentaje_sobre_total } = row
    if (!Number.isInteger(orden) || orden < 0 || !id || !nombre || !['basica','media_superior','superior'].includes(macro_nivel)) throw Error('Nivel incompleto o inválido')
    unique(`${ciclo}/${seccion}/nivel/${orden}`)
    unique(`${ciclo}/${seccion}/id/${id}`)
    const level = { id, nombre, macro_nivel, totales_control: {}, total, porcentaje_sobre_total }
    for (const field of [...controls, 'total', 'porcentaje_sobre_total']) if (typeof row[field] !== 'number' || !Number.isFinite(row[field]) || row[field] < 0 || (field !== 'porcentaje_sobre_total' && !Number.isInteger(row[field]))) throw Error(`Cifra inválida en ${ciclo}/${seccion}/${id}/${field}`)
    controls.forEach(control => level.totales_control[control] = row[control])
    ;(target(ciclo,seccion).niveles ??= [])[orden] = level
  }
  for (const row of records('Complementos')) {
    const { ciclo, seccion, ruta, tipo, valor } = row
    unique(`${ciclo}/${seccion}/${ruta}`)
    const path = JSON.parse(ruta)
    if (path[0] === 'niveles') throw Error('Los niveles se editan en la hoja Niveles')
    if (!['number','string','boolean','null'].includes(tipo)) throw Error(`Tipo inválido: ${tipo}`)
    if (tipo !== 'null' && (typeof valor !== tipo || (tipo === 'number' && !Number.isFinite(valor)))) throw Error(`Valor incompatible en ${ruta}`)
    assign(target(ciclo,seccion),path,tipo === 'null' ? null : valor)
  }
  if (!Object.keys(result).length) throw Error('El Excel no contiene ciclos')
  for (const [cycle, data] of Object.entries(result)) for (const domain of domains) {
    const d=data[domain]
    if (!d || d.meta?.ciclo !== cycle || !Number.isFinite(d.meta?.total_general) || !d.niveles?.length || Array.from(d.niveles).some(n=>!n)) throw Error(`Datos incompletos: ${cycle}/${domain}`)
    for (const key of ['controles_totales','subtotales_macro_nivel','modalidades']) if (!d[key]) throw Error(`Falta ${key} en ${cycle}/${domain}`)
    if (domain === 'escuelas' && !d.publico_privado_escolarizada) throw Error(`Falta distribución pública/privada: ${cycle}`)
  }
  return result
}
if (process.argv.includes('--create')) {
  if (fs.existsSync(file)) throw Error('El archivo maestro ya existe; no se sobrescribe')
  const source = {}, levels = [], extras = []
  for (const cycle of ['2024-2025','2025-2026']) {
    source[cycle] = {}
    for (const domain of domains) {
      const base = cycle === '2025-2026' ? 'src/data' : `src/data/historico/${cycle}`
      const data=JSON.parse(fs.readFileSync(`${base}/${domain}.json`,'utf8'))
      source[cycle][domain]=data
      data.niveles.forEach((n,orden)=>levels.push({ciclo:cycle,seccion:domain,orden,id:n.id,nombre:n.nombre,macro_nivel:n.macro_nivel,...n.totales_control,total:n.total,porcentaje_sobre_total:n.porcentaje_sobre_total}))
      const {niveles,...rest}=data
      leaves(rest).forEach(row=>extras.push({ciclo:cycle,seccion:domain,...row}))
    }
  }
  const book=XLSX.utils.book_new()
  const instructions=[
    ['Archivo maestro de cifras del Observatorio'],
    ['Niveles: una fila por ciclo, sección y nivel; controles en columnas.'],
    ['Complementos: totales publicados, modalidades, indicadores y fuentes. No sumar esta hoja con Niveles.'],
    ['Los totales publicados se conservan, no se recalculan: pueden tener alcances distintos.'],
    ['Cero significa cero. No sustituir valores faltantes por cero. Se rechazan cifras vacías en Niveles.'],
    ['Para agregar un ciclo, duplicar sus filas en ambas hojas para las tres secciones y actualizar cifras y meta.ciclo.'],
    ['No cambiar encabezados, rutas ni tipos. Pegar valores, no fórmulas. Orden empieza en 0.'],
    ['Guardar y ejecutar npm run data:import; npm run build también importa antes de compilar.'],
    ['Publicar después para actualizar el sitio. Editar el Excel descargado no cambia automáticamente la web.'],
    ['Alcance: estudiantes, docentes y escuelas. El catálogo de planes, series EMS y Excel municipales conservan sus fuentes independientes.'],
    ['No se inventaron fuentes ni fechas para los registros históricos que no las incluyen.']
  ]
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(instructions),'Guia')
  for (const [name,rows] of [['Niveles',levels],['Complementos',extras]]) {
    const sheet=XLSX.utils.json_to_sheet(rows)
    sheet['!autofilter']={ref:sheet['!ref']}
    sheet['!cols']=Object.keys(rows[0]).map(k=>({wch:k==='ruta'?65:k==='valor'?75:k==='nombre'?24:20}))
    XLSX.utils.book_append_sheet(book,sheet,name)
  }
  assert.deepEqual(readWorkbook(book),source,'El Excel debe conservar todas las cifras originales')
  XLSX.writeFile(book,file)
  assert.deepEqual(readWorkbook(XLSX.readFile(file)),source,'La lectura del Excel guardado debe ser idéntica')
  console.log(`Excel creado: ${levels.length} niveles y ${extras.length} registros complementarios; comparación exacta correcta.`)
}
const data=readWorkbook(XLSX.readFile(file))
fs.writeFileSync('src/data/cifras.generated.json',JSON.stringify(data,null,2)+'\n')
console.log(`Datos importados: ${Object.keys(data).join(', ')}`)
