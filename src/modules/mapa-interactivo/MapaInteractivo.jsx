import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { PALETTES, METHODS, NO_DATA_COLOR, buildScale, municipalityStroke } from '../../utils/mapColors';
import { normalizeMunicipality as normalize, parseMapNumber, readFirstMapSheet } from '../../utils/mapData';
import { buildRankingBars } from '../../utils/rankingBars';
import { exportMapPNG } from '../../utils/exportMap';
import { USAGE_KEY, EMPTY_USAGE, readUsage, incrementUsage } from '../../utils/mapUsage';
import MapPresentation from './MapPresentation';
import mapSvgRaw from './MapaMunicipios_2.svg?raw';

const SVG_HTML={__html:mapSvgRaw};
const MUNICIPALITIES=[...mapSvgRaw.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)].map(m=>({id:m[1],name:m[1].replace(/_/g,' ')})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
const ID_BY_NAME=new Map(MUNICIPALITIES.map(m=>[normalize(m.id),m.id]));
const formatter=new Intl.NumberFormat('es-MX',{maximumFractionDigits:4});
const format=(v,percent=false)=>Number.isFinite(v)?`${formatter.format(v)}${percent?'%':''}`:'Sin dato';

export default function MapaInteractivo() {
  const uid=useId(),fileInputRef=useRef(null),mapRef=useRef(null),tooltipRef=useRef(null),busy=useRef(false),exportBusy=useRef(false),visited=useRef(false);
  const presentationRef=useRef(null);
  const [usage,setUsage]=useState(EMPTY_USAGE);
  const usageRef=useRef({...EMPTY_USAGE});
  const [persistent,setPersistent]=useState(true);
  const record=events=>{
    let current=usageRef.current;
    try{current=readUsage(window.localStorage);}catch{setPersistent(false);}
    const next=incrementUsage(current,events);usageRef.current=next;setUsage(next);
    try{window.localStorage.setItem(USAGE_KEY,JSON.stringify(next));}catch{setPersistent(false);}
  };
  useEffect(()=>{if(!visited.current){visited.current=true;record(['visitas']);}},[]);
  const [sheet,setSheet]=useState(null);
  const [fileName,setFileName]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const [xId,setXId]=useState('');
  const [palette,setPalette]=useState('institucional'),[method,setMethod]=useState('quantiles'),[reverse,setReverse]=useState(false);
  const [search,setSearch]=useState(''),[selected,setSelected]=useState([]);
  const mapTheme=PALETTES[palette];
  const themeStyle={'--map-background':mapTheme.background,'--map-heading':mapTheme.heading};
  const dataset=sheet?.data;
  const metrics=dataset?.metrics||[];
  const x=metrics.find(m=>m.id===xId);
  const selectedSet=useMemo(()=>new Set(selected),[selected]);
  const records=useMemo(()=>{
    if(!dataset)return [];
    return dataset.grid.slice(1).map(row=>({
      id:ID_BY_NAME.get(normalize(row[dataset.nombre])),name:String(row[dataset.nombre]).trim().replace(/_/g,' '),
      x:x?parseMapNumber(row[x.idx]):null,
    }));
  },[dataset,x]);
  const matched=useMemo(()=>records.filter(r=>r.id),[records]);
  const unmatched=records.filter(r=>!r.id);
  const region=useMemo(()=>matched.filter(r=>!selectedSet.size||selectedSet.has(r.id)),[matched,selectedSet]);
  const dataMap=useMemo(()=>new Map(matched.map(r=>[r.id,r])),[matched]);
  const sx=useMemo(()=>buildScale(region.map(r=>r.x),{palette,method,reverse,percent:x?.percent}),[region,palette,method,reverse,x]);
  const getColor=r=>r?sx.color(r.x):NO_DATA_COLOR;
  const hasData=region.some(r=>Number.isFinite(r.x));
  const candidates=MUNICIPALITIES.filter(m=>normalize(m.name).includes(normalize(search)));
  const toggle=id=>setSelected(previous=>previous.includes(id)?previous.filter(v=>v!==id):[...previous,id]);
  const missingCount=(selected.length||MUNICIPALITIES.length)-region.filter(r=>Number.isFinite(r.x)).length;
  const ranked=region.filter(r=>Number.isFinite(r.x)).sort((a,b)=>a.x-b.x||a.name.localeCompare(b.name,'es'));
  const rankingBar=buildRankingBars(ranked.map(r=>r.x));
  const minimumBar=buildRankingBars(ranked.slice(0,10).map(r=>r.x));
  const title=x?.label||'Mapa municipal';
  const countedView=useRef('');
  useEffect(()=>{
    if(!hasData)return;
    const key=`${fileName}:${sheet?.name}:${xId}`;
    if(countedView.current!==key){countedView.current=key;record(['visualizaciones']);}
  },[fileName,sheet,xId,hasData]);

  const hideTooltip=()=>{if(tooltipRef.current)tooltipRef.current.style.display='none';};
  useEffect(()=>{
    const paths=mapRef.current.querySelectorAll('path[id]');
    paths.forEach(el=>{
      const r=dataMap.get(el.id),included=!selectedSet.size||selectedSet.has(el.id);
      const text=`${r?.name||el.id.replace(/_/g,' ')}\n${x?.label||'Valor'}: ${format(r?.x,x?.percent)}`;
      const fill=getColor(r);
      el.style.fill=fill;el.style.opacity=included?'1':'0.12';el.style.stroke=municipalityStroke(fill);el.style.strokeWidth='0.7';el.style.cursor='pointer';
      el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-pressed',String(selectedSet.has(el.id)));el.setAttribute('aria-label',text);
      const show=(left,top)=>{const t=tooltipRef.current;t.textContent=text;t.style.display='block';t.style.left=`${Math.max(8,Math.min(left+12,window.innerWidth-t.offsetWidth-8))}px`;t.style.top=`${Math.max(8,Math.min(top+12,window.innerHeight-t.offsetHeight-8))}px`;};
      el.onmouseenter=e=>show(e.clientX,e.clientY);el.onmousemove=e=>show(e.clientX,e.clientY);el.onmouseleave=hideTooltip;
      el.onfocus=()=>{const b=el.getBoundingClientRect();show(b.left,b.top);};el.onblur=hideTooltip;el.onclick=()=>toggle(el.id);
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(el.id);}if(e.key==='Escape')hideTooltip();};
    });
    return ()=>{paths.forEach(el=>{el.onmouseenter=el.onmousemove=el.onmouseleave=el.onfocus=el.onblur=el.onclick=el.onkeydown=null;});hideTooltip();};
  },[dataMap,selectedSet,sx,x]);

  const upload=async file=>{
    if(busy.current)return;busy.current=true;setLoading(true);setError('');setExportError('');
    try{
      const XLSX=await import('xlsx');
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellNF:true});
      const first=readFirstMapSheet(XLSX,wb);
      setSheet(first);setFileName(file.name);setSelected([]);setSearch('');
      const cols=first.data.metrics;setXId(cols[0].id);countedView.current='';record(['cargas']);
    }catch(e){setError(e.message||'No fue posible leer el archivo Excel.');}
    finally{busy.current=false;setLoading(false);}
  };
  const exportPNG=async()=>{
    if(exportBusy.current||!hasData)return;exportBusy.current=true;setExporting(true);setExportError('');
    try{
      const legend=sx.legend.map(l=>({...l,label:`${l.label} (${l.count} municipios)`}));
      legend.push({color:NO_DATA_COLOR,label:`Sin dato (${missingCount} municipios)`});
      await exportMapPNG(mapRef.current.querySelector('svg'),{selected,title,legend,method:METHODS[method]});
    }catch(e){setExportError(e.message);}finally{exportBusy.current=false;setExporting(false);}
  };

  return <div className="mapa-interactivo" style={themeStyle}>
    <div className="mapa-card">
      <div className="mapa-card__header"><div><p className="mapa-card__eyebrow">Explorador geográfico</p><h3>Mapa interactivo municipal</h3><p>Construye tu mapa paso a paso. Cada elección actualiza la vista automáticamente.</p></div>
        <div className="mapa-card__actions"><a className="mapa-btn mapa-btn--ghost" href="/BD_municipios.xlsx" download>Plantilla Excel</a>
          <button type="button" className="mapa-btn mapa-btn--outline" disabled={loading} onClick={()=>fileInputRef.current?.click()}>{loading?'Leyendo Excel…':'Cargar Excel'}</button><input ref={fileInputRef} className="sr-only" aria-label="Cargar Excel" type="file" accept=".xlsx,.xls" disabled={loading} onChange={e=>{if(e.target.files?.[0])upload(e.target.files[0]);e.target.value='';}} />
          </div></div>
      {error&&<p role="alert">{error}</p>}{exportError&&<p role="alert">{exportError}</p>}{loading&&<p role="status">Leyendo y validando la primera hoja…</p>}
      {fileName&&<p>Archivo: <strong>{fileName}</strong> · {matched.length} municipios vinculados al mapa.</p>}
      {!!unmatched.length&&<details><summary>{unmatched.length} nombres no coinciden con el mapa (excluidos del análisis)</summary><p>{unmatched.map(r=>r.name).join(', ')}</p></details>}
      {!dataset&&<p className="mapa-flow-note">Empieza con «Cargar Excel». Si usas la plantilla, primero completa tus indicadores. Después podrás elegir la columna que quieres representar.</p>}
      {dataset&&<section className="mapa-flow-step mapa-column-step" aria-labelledby={`${uid}-analysis`}>
      <h4 id={`${uid}-analysis`}>1. Elige la columna a representar</h4>
      <div className="mapa-filters-inline">
        <label>Columna a representar<select className="mapa-input" value={xId} onChange={e=>setXId(e.target.value)}>{metrics.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
      </div>
      </section>}
      {dataset&&<>
      <fieldset className="mapa-color-controls"><legend>2. Elige cómo agrupar los valores en colores</legend>
        <label>Gama<select className="mapa-input" value={palette} onChange={e=>setPalette(e.target.value)}>{Object.entries(PALETTES).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label><div className="mapa-invert-control">
          <button type="button" className="mapa-btn mapa-btn--outline" aria-pressed={reverse} onClick={()=>setReverse(value=>!value)}>
            <span aria-hidden="true">⇄</span> {reverse?'Restaurar colores':'Invertir colores'}
          </button>
          <small>{reverse?'Oscuro → claro':'Claro → oscuro'}</small>
          <div className="mapa-palette-preview" aria-label="Orden actual de colores">{sx.colors.map(color=><span key={color} style={{backgroundColor:color}} />)}</div>
        </div>
        {mapTheme.description&&<p className="mapa-palette-note">{mapTheme.description}</p>}
        <label>Método de Estratificación<select className="mapa-input" value={method} onChange={e=>setMethod(e.target.value)}>{Object.entries(METHODS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <p>{method==='quantiles'?'Cuantiles: busca grupos con cantidades similares de municipios.':method==='equal'?'Intervalos iguales: divide el rango de valores en cinco tramos del mismo tamaño.':'Dalenius–Hodges: utiliza la distribución de frecuencias para formar los grupos.'}</p>
        {method==='dalenius'&&<details><summary>Detalle del cálculo</summary><p>Dalenius–Hodges: histograma de intervalos iguales (√n, mínimo 5), suma acumulada de √frecuencia y cortes interpolados en quintas partes.</p></details>}
      </fieldset>
      <div className="mapa-legend">{sx.legend.map((l,i)=><span key={i}><i style={{backgroundColor:l.color}} />{l.label} ({l.count})</span>)}<span><i style={{backgroundColor:NO_DATA_COLOR}} />Sin dato ({missingCount})</span></div>
      <div className="mapa-flow-step">
        <h4>3. Revisa el mapa y sus valores</h4>
        <p>{title} · {selected.length?`${selected.length} municipios seleccionados`:'Todo el estado'} · {METHODS[method]}</p>
        {!hasData&&<p role="status">No hay datos suficientes para pintar esta selección. Revisa las columnas o amplía la región.</p>}
        <div className="mapa-view-actions"><button className="mapa-btn" disabled={!hasData||loading||exporting} onClick={exportPNG}>{exporting?'Generando PNG…':'Exportar región (PNG)'}</button><button type="button" className="mapa-btn mapa-btn--outline" disabled={!hasData||loading||exporting} onClick={()=>{hideTooltip();presentationRef.current.open(mapRef.current.querySelector('svg'));}}>Presentar Mapa</button></div>
      </div>
      </>}
      <div className="mapa-content" hidden={!dataset}><div className="mapa-map-panel">{!dataset&&<p>Carga un Excel con datos para colorear el mapa. Se admiten porcentajes de Excel y textos como 25%.</p>}<div ref={mapRef} className="mapa-svg-wrapper" dangerouslySetInnerHTML={SVG_HTML} /></div>
      <section className="mapa-ranking-panel"><h4>Máximos y mínimos · {x?.label||'Indicador'}</h4><p>Municipios de la región; colores del mapa.</p>
        <p className="mapa-ranking-help">Los mínimos usan una escala propia: el mayor valor de esa lista equivale al 100 % cuando los valores son positivos. Compara las longitudes dentro de cada lista; los valores negativos conservan su referencia en cero.</p>
        <div className="mapa-extremes-columns">{[{title:'10 valores mayores',rows:ranked.slice(-10).reverse(),bar:rankingBar},{title:'10 valores menores',rows:ranked.slice(0,10),bar:minimumBar}].map(group=>(
          <div className="mapa-ranking" key={group.title}>
            <h5>{group.title}</h5>
            <ul>{group.rows.map(r=>{
              const bar=group.bar(r.x);
              return <li key={r.id} className="mapa-rank-item">
                <span className="mapa-rank-swatch" style={{backgroundColor:getColor(r)}} aria-hidden="true" />
                <span>{r.name}</span>
                <strong>{format(r.x,x?.percent)}</strong>
                <div className="mapa-rank-track" aria-hidden="true">
                  <span className="mapa-rank-fill" style={{left:`${bar.left}%`,width:`${bar.width}%`,backgroundColor:getColor(r)}} />
                  <span className="mapa-rank-zero" style={{left:`${bar.zero}%`}} />
                </div>
              </li>;
            })}</ul>
          </div>
        ))}</div>{!ranked.length&&<p>No hay valores numéricos en la región seleccionada.</p>}</section>
      <fieldset className="mapa-region"><legend>4. Elige municipios y define tu región (opcional)</legend>
        <label htmlFor={`${uid}-search`}>Buscar y agregar municipios</label><input className="mapa-input" id={`${uid}-search`} type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ej. Toluca" />
        <p>{selected.length?`${selected.length} municipios seleccionados`:'Sin selección: se muestra todo el estado.'}</p>
        <div className="mapa-region-actions"><button className="mapa-btn mapa-btn--outline" disabled={!candidates.length} onClick={()=>setSelected(previous=>[...new Set([...previous,...candidates.map(m=>m.id)])])}>Agregar resultados</button><button className="mapa-btn mapa-btn--ghost" onClick={()=>setSelected([])}>Mostrar todo el estado</button></div>
        {!!selected.length&&<div className="mapa-selected">{selected.map(id=><button key={id} onClick={()=>toggle(id)} aria-label={`Quitar ${id.replace(/_/g,' ')}`}>{id.replace(/_/g,' ')} ×</button>)}</div>}
        <div className="mapa-municipality-list">{candidates.map(m=><label key={m.id}><input type="checkbox" checked={selectedSet.has(m.id)} onChange={()=>toggle(m.id)} />{m.name}</label>)}{!candidates.length&&<p>No hay coincidencias.</p>}</div>
      </fieldset>
      <div className="mapa-view-actions"><button className="mapa-btn" disabled={!hasData||loading||exporting} onClick={exportPNG}>{exporting?'Generando PNG…':'Exportar región (PNG)'}</button><button type="button" className="mapa-btn mapa-btn--outline" disabled={!hasData||loading||exporting} onClick={()=>{hideTooltip();presentationRef.current.open(mapRef.current.querySelector('svg'));}}>Presentar Mapa</button></div>
      </div>
    </div>
    <details className="mapa-usage"><summary>Actividad local de esta herramienta</summary><p>Entradas: {usage.visitas} · Excel cargados: {usage.cargas} · Visualizaciones: {usage.visualizaciones}</p><p>Contadores de este navegador; cambiar región o colores no suma una visualización.</p>{!persistent&&<p>No se pueden guardar los contadores.</p>}</details>
    <MapPresentation themeStyle={themeStyle} ref={presentationRef} title={title} selected={selected} method={METHODS[method]} ranked={ranked} color={getColor} formatValue={value=>format(value,x?.percent)} rankingBar={rankingBar} minimumBar={minimumBar} legend={[...sx.legend.map(item=>({...item,label:`${item.label} (${item.count} municipios)`})),{color:NO_DATA_COLOR,label:`Sin dato (${missingCount} municipios)`}]} />
    <div ref={tooltipRef} className="mapa-tooltip" />
  </div>;
}
