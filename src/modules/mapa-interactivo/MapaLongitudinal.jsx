import React, { useEffect, useMemo, useRef, useState } from 'react'
import mapSvgRaw from './MapaMunicipios_2.svg?raw'
import { buildScale, NO_DATA_COLOR } from '../../utils/mapColors'
import { normalizeMunicipality as normalize } from '../../utils/mapData'
import { buildRankingBars } from '../../utils/rankingBars'
import { useEducationalFilters } from '../../context/EducationalFiltersContext'
import { getLevelMunicipalData, getMunicipalDataByCycle } from '../../services/observatorioData'

const SVG_HTML = { __html: mapSvgRaw }
const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })
const METRICS = { alumnos_total:'Estudiantes', docentes_total:'Docentes', total_escuelas:'Escuelas', total_servicios_turno:'Servicios-turno', ratio_alumnos_docente:'Estudiantes por docente', pobreza_pct:'Población en situación de pobreza' }
const ADDITIVE = new Set(['alumnos_total','docentes_total','total_escuelas','total_servicios_turno'])

export default function MapaLongitudinal() {
  const mapRef=useRef(null), tooltipRef=useRef(null), filters=useEducationalFilters()
  const [municipal,setMunicipal]=useState([]), [levels,setLevels]=useState([]), [metric,setMetric]=useState('alumnos_total')
  const [loading,setLoading]=useState(false), [error,setError]=useState('')
  useEffect(()=>{ if(!filters.selectedCycle)return; let alive=true; setLoading(true); setError(''); Promise.all([getMunicipalDataByCycle(filters.selectedCycle),getLevelMunicipalData(filters.selectedCycle)]).then(([m,l])=>{if(alive){setMunicipal(m);setLevels(l)}}).catch(e=>alive&&setError(e.message)).finally(()=>alive&&setLoading(false)); return()=>{alive=false} },[filters.selectedCycle])

  const levelOptions=useMemo(()=>[...new Map(levels.map(r=>[r.nivel,r])).values()].sort((a,b)=>(a.orden_display??0)-(b.orden_display??0)),[levels])
  const sublevelOptions=useMemo(()=>[...new Set(levels.filter(r=>!filters.selectedLevel||r.nivel===filters.selectedLevel).map(r=>r.subnivel).filter(Boolean))],[levels,filters.selectedLevel])
  useEffect(()=>{if(filters.selectedLevel&&!levelOptions.some(r=>r.nivel===filters.selectedLevel)){filters.setSelectedLevel('');filters.setSelectedSublevel('')}},[levelOptions,filters.selectedCycle])
  useEffect(()=>{if(filters.selectedSublevel&&!sublevelOptions.includes(filters.selectedSublevel))filters.setSelectedSublevel('')},[sublevelOptions,filters.selectedLevel])

  const effectiveMetric=filters.selectedLevel&&!filters.selectedSublevel&&!ADDITIVE.has(metric)?'alumnos_total':metric
  const records=useMemo(()=>{
    if(!filters.selectedLevel&&!filters.selectedSublevel)return municipal.map(r=>({...r,mapName:r.nombre,mapKey:r.nombre_svg}))
    const grouped=new Map()
    levels.filter(r=>(!filters.selectedLevel||r.nivel===filters.selectedLevel)&&(!filters.selectedSublevel||r.subnivel===filters.selectedSublevel)).forEach(r=>{
      const current=grouped.get(r.municipio_id)||{...r,mapName:r.municipio,mapKey:r.nombre_svg}
      if(grouped.has(r.municipio_id)&&ADDITIVE.has(effectiveMetric))current[effectiveMetric]=(current[effectiveMetric]??0)+(r[effectiveMetric]??0)
      grouped.set(r.municipio_id,current)
    }); return [...grouped.values()]
  },[municipal,levels,filters.selectedLevel,filters.selectedSublevel,effectiveMetric])
  const dataMap=useMemo(()=>new Map(records.map(r=>[normalize(r.mapKey),r])),[records])
  const scale=useMemo(()=>buildScale(records.map(r=>r[effectiveMetric]),{palette:'categoria1',method:'quantiles'}),[records,effectiveMetric])
  const ranked=useMemo(()=>records.filter(r=>r[effectiveMetric]!=null&&Number.isFinite(Number(r[effectiveMetric]))).sort((a,b)=>Number(a[effectiveMetric])-Number(b[effectiveMetric])),[records,effectiveMetric])
  const rankingBar=useMemo(()=>buildRankingBars(ranked.map(r=>Number(r[effectiveMetric]))),[ranked])

  useEffect(()=>{const paths=mapRef.current?.querySelectorAll('path[id]')||[],hide=()=>{if(tooltipRef.current)tooltipRef.current.style.display='none'};paths.forEach(path=>{const row=dataMap.get(normalize(path.id)),raw=row?.[effectiveMetric],valid=raw!=null&&Number.isFinite(Number(raw));const year=effectiveMetric==='pobreza_pct'?` (${row?.anio_pobreza_contexto??'año N/D'})`:'';const text=`${row?.mapName||path.id.replaceAll('_',' ')}\n${METRICS[effectiveMetric]}${year}: ${valid?number.format(raw):'N/D'}`;path.style.fill=valid?scale.color(Number(raw)):NO_DATA_COLOR;path.style.stroke='#475569';path.style.strokeWidth='.7';path.style.cursor='pointer';path.style.opacity=filters.selectedMunicipality&&filters.selectedMunicipality!==row?.mapName?'.2':'1';path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',text);const show=e=>{const t=tooltipRef.current;if(!t)return;t.textContent=text;t.style.display='block';t.style.left=`${e.clientX+12}px`;t.style.top=`${e.clientY+12}px`};path.onmouseenter=show;path.onmousemove=show;path.onmouseleave=hide;path.onblur=hide;path.onclick=()=>filters.setSelectedMunicipality(filters.selectedMunicipality===row?.mapName?'':(row?.mapName||''))});return()=>{paths.forEach(p=>{p.onmouseenter=p.onmousemove=p.onmouseleave=p.onblur=p.onclick=null});hide()}},[dataMap,scale,effectiveMetric,filters.selectedMunicipality])

  if(loading)return <p className="mapa-flow-note" role="status">Cargando los municipios del ciclo {filters.selectedCycle}…</p>
  if(error)return <p className="mapa-flow-note" role="alert">No fue posible cargar el mapa longitudinal: {error}</p>
  if(!municipal.length)return <p className="mapa-flow-note">No hay información municipal para {filters.selectedCycle}.</p>
  const withoutIes=municipal.filter(r=>r.n_programas_ies===0).length
  return <div className="mapa-interactivo"><div className="mapa-card"><div className="mapa-card__header"><div><p className="mapa-card__eyebrow">Datos oficiales longitudinales</p><h3>Mapa educativo municipal · {filters.selectedCycle}</h3><p>{municipal.length} municipios vinculados mediante nombre_svg. El ciclo actualiza mapa, tooltip y rankings.</p></div></div>
    <div className="mapa-filters-inline"><Select label="Métrica" value={metric} onChange={setMetric} options={Object.keys(METRICS)} labels={METRICS}/><Select label="Nivel" value={filters.selectedLevel} onChange={v=>{filters.setSelectedLevel(v);filters.setSelectedSublevel('')}} options={levelOptions.map(r=>r.nivel)}/><Select label="Subnivel" value={filters.selectedSublevel} onChange={filters.setSelectedSublevel} options={sublevelOptions}/><Select label="Municipio" value={filters.selectedMunicipality} onChange={filters.setSelectedMunicipality} options={municipal.map(r=>r.nombre)}/></div>
    {metric!==effectiveMetric&&<p className="mapa-flow-note">Para no recalcular ratios agregados, se muestran estudiantes hasta elegir un subnivel específico.</p>}<p>{withoutIes} municipios sin programas IES registrados.</p>
    <div className="mapa-content"><div className="mapa-map-panel"><div ref={mapRef} className="mapa-svg-wrapper" dangerouslySetInnerHTML={SVG_HTML}/></div><section className="mapa-ranking-panel"><h4>Máximos y mínimos · {METRICS[effectiveMetric]}</h4><div className="mapa-extremes-columns">{[{title:'5 valores mayores',rows:ranked.slice(-5).reverse()},{title:'5 valores menores',rows:ranked.slice(0,5)}].map(g=><div className="mapa-ranking" key={g.title}><h5>{g.title}</h5><ul>{g.rows.map(r=>{const v=Number(r[effectiveMetric]),bar=rankingBar(v);return <li key={r.municipio_id} className="mapa-rank-item"><span>{r.mapName}</span><strong>{number.format(v)}</strong><div className="mapa-rank-track"><span className="mapa-rank-fill" style={{left:`${bar.left}%`,width:`${bar.width}%`,backgroundColor:scale.color(v)}}/></div></li>})}</ul></div>)}</div></section></div></div><div ref={tooltipRef} className="mapa-tooltip"/></div>
}

function Select({label,value,onChange,options,labels}){return <label>{label}<select className="mapa-input" value={value} onChange={e=>onChange(e.target.value)}><option value="">Todos</option>{options.map(o=><option key={o} value={o}>{labels?.[o]||o}</option>)}</select></label>}
