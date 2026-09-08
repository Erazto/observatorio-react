import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { PALETTES, METHODS, NO_DATA_COLOR, buildScale, pearson, bivariateColor } from '../../utils/mapColors';
import { normalizeMunicipality as normalize, parseMapNumber, inspectMapGrid, worksheetGrid } from '../../utils/mapData';
import { exportMapPNG } from '../../utils/exportMap';
import { USAGE_KEY, EMPTY_USAGE, readUsage, incrementUsage } from '../../utils/mapUsage';
import mapSvgRaw from './MapaMunicipios_2.svg?raw';

const SVG_HTML={__html:mapSvgRaw};
const MUNICIPALITIES=[...mapSvgRaw.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)].map(m=>({id:m[1],name:m[1].replace(/_/g,' ')})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
const ID_BY_NAME=new Map(MUNICIPALITIES.map(m=>[normalize(m.id),m.id]));
const formatter=new Intl.NumberFormat('es-MX',{maximumFractionDigits:4});
const format=(v,percent=false)=>Number.isFinite(v)?`${formatter.format(v)}${percent?'%':''}`:'Sin dato';

export default function MapaInteractivo() {
  const uid=useId(),fileInputRef=useRef(null),mapRef=useRef(null),tooltipRef=useRef(null),busy=useRef(false),exportBusy=useRef(false),visited=useRef(false);
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
  const [sheets,setSheets]=useState([]),[sheetIndex,setSheetIndex]=useState('0');
  const [fileName,setFileName]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const [xId,setXId]=useState(''),[yId,setYId]=useState(''),[mode,setMode]=useState('single');
  const [palette,setPalette]=useState('categoria1'),[method,setMethod]=useState('quantiles'),[reverse,setReverse]=useState(false);
  const [search,setSearch]=useState(''),[selected,setSelected]=useState([]);
  const dataset=sheets[Number(sheetIndex)]?.data;
  const metrics=dataset?.metrics||[];
  const x=metrics.find(m=>m.id===xId),y=metrics.find(m=>m.id===yId);
  const selectedSet=useMemo(()=>new Set(selected),[selected]);
  const records=useMemo(()=>{
    if(!dataset)return [];
    return dataset.grid.slice(1).map(row=>({
      id:ID_BY_NAME.get(normalize(row[dataset.nombre])),name:String(row[dataset.nombre]),
      x:x?parseMapNumber(row[x.idx]):null,y:y?parseMapNumber(row[y.idx]):null,
    }));
  },[dataset,x,y]);
  const matched=useMemo(()=>records.filter(r=>r.id),[records]);
  const unmatched=records.filter(r=>!r.id);
  const region=useMemo(()=>matched.filter(r=>!selectedSet.size||selectedSet.has(r.id)),[matched,selectedSet]);
  const dataMap=useMemo(()=>new Map(matched.map(r=>[r.id,r])),[matched]);
  const sx=useMemo(()=>buildScale(region.map(r=>r.x),{palette:mode==='bivariate'?'categoria1':palette,method,reverse:mode==='bivariate'?false:reverse,percent:x?.percent}),[region,palette,method,reverse,x,mode]);
  const sy=useMemo(()=>buildScale(region.map(r=>r.y),{method,percent:y?.percent}),[region,method,y]);
  const correlation=useMemo(()=>pearson(region.map(r=>[r.x,r.y])),[region]);
  const getColor=r=>!r?NO_DATA_COLOR:mode==='single'?sx.color(r.x):bivariateColor(sx.index(r.x),sy.index(r.y));
  const hasData=region.some(r=>Number.isFinite(r.x)&&(mode==='single'||Number.isFinite(r.y)));
  const candidates=MUNICIPALITIES.filter(m=>normalize(m.name).includes(normalize(search)));
  const toggle=id=>setSelected(previous=>previous.includes(id)?previous.filter(v=>v!==id):[...previous,id]);
  const ranked=region.filter(r=>Number.isFinite(r.x)).sort((a,b)=>a.x-b.x||a.name.localeCompare(b.name,'es'));
  const title=mode==='single'?(x?.label||'Mapa municipal'):`${x?.label||'X'} × ${y?.label||'Y'}`;
  const correlationText=correlation.r===null?correlation.reason:`Pearson r = ${format(correlation.r)}; r × 100 = ${format(correlation.r*100)}%.`;
  const countedView=useRef('');
  useEffect(()=>{
    if(!hasData)return;
    const key=`${fileName}:${sheetIndex}:${xId}:${yId}:${mode}`;
    if(countedView.current!==key){countedView.current=key;record(['visualizaciones']);}
  },[fileName,sheetIndex,xId,yId,mode,hasData]);

  const hideTooltip=()=>{if(tooltipRef.current)tooltipRef.current.style.display='none';};
  useEffect(()=>{
    const paths=mapRef.current.querySelectorAll('path[id]');
    paths.forEach(el=>{
      const r=dataMap.get(el.id),included=!selectedSet.size||selectedSet.has(el.id);
      const text=`${r?.name||el.id.replace(/_/g,' ')}\n${x?.label||'Valor'}: ${format(r?.x,x?.percent)}${mode==='bivariate'?`\n${y?.label||'Y'}: ${format(r?.y,y?.percent)}`:''}`;
      el.style.fill=getColor(r);el.style.opacity=included?'1':'0.12';el.style.stroke='#475569';el.style.strokeWidth='0.7';el.style.cursor='pointer';
      el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-pressed',String(selectedSet.has(el.id)));el.setAttribute('aria-label',text);
      const show=(left,top)=>{const t=tooltipRef.current;t.textContent=text;t.style.display='block';t.style.left=`${Math.max(8,Math.min(left+12,window.innerWidth-t.offsetWidth-8))}px`;t.style.top=`${Math.max(8,Math.min(top+12,window.innerHeight-t.offsetHeight-8))}px`;};
      el.onmouseenter=e=>show(e.clientX,e.clientY);el.onmousemove=e=>show(e.clientX,e.clientY);el.onmouseleave=hideTooltip;
      el.onfocus=()=>{const b=el.getBoundingClientRect();show(b.left,b.top);};el.onblur=hideTooltip;el.onclick=()=>toggle(el.id);
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(el.id);}if(e.key==='Escape')hideTooltip();};
    });
    return ()=>{paths.forEach(el=>{el.onmouseenter=el.onmousemove=el.onmouseleave=el.onfocus=el.onblur=el.onclick=el.onkeydown=null;});hideTooltip();};
  },[dataMap,selectedSet,sx,sy,mode,x,y]);

  const chooseSheet=index=>{
    setSheetIndex(index);const data=sheets[Number(index)]?.data;
    setXId(data?.metrics[0]?.id||'');setYId(data?.metrics[1]?.id||'');
    if((data?.metrics.length||0)<2)setMode('single');
  };
  const upload=async file=>{
    if(busy.current)return;busy.current=true;setLoading(true);setError('');
    try{
      const XLSX=await import('xlsx');
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellNF:true});
      const parsed=wb.SheetNames.map(name=>{try{return {name,data:inspectMapGrid(worksheetGrid(XLSX,wb.Sheets[name]))};}catch(e){return {name,error:e.message};}});
      const first=parsed.findIndex(s=>s.data);
      if(first<0)throw new Error(parsed.map(s=>`${s.name}: ${s.error}`).join(' '));
      setSheets(parsed);setSheetIndex(String(first));setFileName(file.name);setSelected([]);setSearch('');
      const cols=parsed[first].data.metrics;setXId(cols[0].id);setYId(cols[1]?.id||'');setMode('single');countedView.current='';record(['cargas']);
    }catch(e){setError(e.message||'No fue posible leer el archivo Excel.');}
    finally{busy.current=false;setLoading(false);}
  };
  const exportPNG=async()=>{
    if(exportBusy.current)return;exportBusy.current=true;setExporting(true);setExportError('');
    try{
      const legend=mode==='single'?sx.legend.map(l=>({...l,label:`${l.label} (${l.count} municipios)`})):
        Array.from({length:25},(_,i)=>({color:bivariateColor(i%5,Math.floor(i/5)),label:`X${i%5+1}: ${sx.legend[i%5].label} · Y${Math.floor(i/5)+1}: ${sy.legend[Math.floor(i/5)].label}`}));
      legend.push({color:NO_DATA_COLOR,label:'Sin dato'});
      await exportMapPNG(mapRef.current.querySelector('svg'),{selected,title,legend,notes:[
        `Método: ${METHODS[method]}. Región: ${selected.length?selected.map(id=>id.replace(/_/g,' ')).join(', '):'Estado de México'}.`,
        `Archivo: ${fileName} · Hoja: ${sheets[Number(sheetIndex)].name}`,
        ...(mode==='bivariate'?[`${correlationText} Pares válidos: ${correlation.n}. r × 100 no es porcentaje de causalidad.`]:[]),
      ]});
    }catch(e){setExportError(e.message);}finally{exportBusy.current=false;setExporting(false);}
  };

  return <div className="mapa-interactivo">
    <aside className="mapa-usage"><h3>Actividad en este navegador</h3><p>Entradas: {usage.visitas} · Excel cargados: {usage.cargas} · Visualizaciones: {usage.visualizaciones}</p><p>Contadores locales; cambiar región, colores o clasificación no suma una visualización.</p>{!persistent&&<p>No se pueden guardar los contadores en este navegador.</p>}</aside>
    <div className="mapa-card">
      <div className="mapa-card__header"><div><p className="mapa-card__eyebrow">Explorador geográfico</p><h3>Mapa interactivo municipal</h3><p>Carga indicadores y selecciona municipios para crear y exportar una región.</p></div>
        <div className="mapa-card__actions"><a className="mapa-btn mapa-btn--ghost" href="/BD_municipios.xlsx" download>Plantilla Excel</a>
          <button type="button" className="mapa-btn mapa-btn--outline" disabled={loading} onClick={()=>fileInputRef.current?.click()}>{loading?'Leyendo Excel…':'Cargar Excel'}</button><input ref={fileInputRef} className="sr-only" aria-label="Cargar Excel" type="file" accept=".xlsx,.xls" disabled={loading} onChange={e=>{if(e.target.files?.[0])upload(e.target.files[0]);e.target.value='';}} />
          <button className="mapa-btn" disabled={!hasData||loading||exporting} onClick={exportPNG}>{exporting?'Generando PNG…':'Exportar región (PNG)'}</button></div></div>
      {error&&<p role="alert">{error}</p>}{exportError&&<p role="alert">{exportError}</p>}{loading&&<p role="status">Leyendo y validando las hojas del archivo…</p>}
      {fileName&&<p>Archivo: <strong>{fileName}</strong> · {matched.length} municipios vinculados al mapa.</p>}
      {!!unmatched.length&&<details><summary>{unmatched.length} nombres no coinciden con el mapa (excluidos del análisis)</summary><p>{unmatched.map(r=>r.name).join(', ')}</p></details>}
      <div className="mapa-filters-inline">
        {!!sheets.length&&<label>Hoja<select className="mapa-input" value={sheetIndex} onChange={e=>chooseSheet(e.target.value)}>{sheets.map((s,i)=><option key={i} value={i} disabled={!s.data}>{s.name}{!s.data?' · sin datos válidos':''}</option>)}</select></label>}
        <label>Modo<select className="mapa-input" value={mode} onChange={e=>setMode(e.target.value)}><option value="single">Una variable</option><option value="bivariate" disabled={metrics.length<2}>Bivariado (dos columnas)</option></select></label>
        <label>{mode==='single'?'Indicador':'Variable X'}<select className="mapa-input" value={xId} disabled={!metrics.length} onChange={e=>{setXId(e.target.value);if(e.target.value===yId)setYId(metrics.find(m=>m.id!==e.target.value)?.id||'');}}>{metrics.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        {mode==='bivariate'&&<label>Variable Y<select className="mapa-input" value={yId} onChange={e=>setYId(e.target.value)}>{metrics.filter(m=>m.id!==xId).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
      </div>
      <fieldset className="mapa-color-controls"><legend>Colores y clasificación</legend>
        {mode==='single'&&<><label>Gama<select className="mapa-input" value={palette} onChange={e=>setPalette(e.target.value)}>{Object.entries(PALETTES).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label><label><input type="checkbox" checked={reverse} onChange={e=>setReverse(e.target.checked)} /> Invertir gama</label></>}
        <label>Método<select className="mapa-input" value={method} onChange={e=>setMethod(e.target.value)}>{Object.entries(METHODS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <p>Cinco clases por variable. Los empates conservan su color y pueden dejar clases vacías. Los cortes se calculan con la región seleccionada.</p>
        {method==='dalenius'&&<p>Dalenius–Hodges: histograma de intervalos iguales (√n, mínimo 5), suma acumulada de √frecuencia y cortes interpolados en quintas partes.</p>}
      </fieldset>
      <fieldset className="mapa-region"><legend>Municipios de la región</legend>
        <label htmlFor={`${uid}-search`}>Buscar y agregar municipios</label><input className="mapa-input" id={`${uid}-search`} type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ej. Toluca" />
        <p>{selected.length?`${selected.length} municipios seleccionados`:'Sin selección: se muestra todo el estado.'}</p>
        <div className="mapa-region-actions"><button className="mapa-btn mapa-btn--outline" onClick={()=>setSelected(previous=>[...new Set([...previous,...candidates.map(m=>m.id)])])}>Agregar resultados</button><button className="mapa-btn mapa-btn--ghost" onClick={()=>setSelected([])}>Mostrar todo el estado</button></div>
        {!!selected.length&&<div className="mapa-selected">{selected.map(id=><button key={id} onClick={()=>toggle(id)} aria-label={`Quitar ${id.replace(/_/g,' ')}`}>{id.replace(/_/g,' ')} ×</button>)}</div>}
        <div className="mapa-municipality-list">{candidates.map(m=><label key={m.id}><input type="checkbox" checked={selectedSet.has(m.id)} onChange={()=>toggle(m.id)} />{m.name}</label>)}{!candidates.length&&<p>No hay coincidencias.</p>}</div>
      </fieldset>
      {mode==='bivariate'&&<div className="mapa-correlation"><h4>Correlación de la región</h4><p>{correlationText} Pares válidos: {correlation.n}.</p><p>r × 100 expresa el coeficiente en escala porcentual (−100% a 100%); no es porcentaje de causalidad ni de varianza explicada.</p><p>La matriz cruza cinco clases de X (verde, de izquierda a derecha) y cinco de Y (violeta, de abajo hacia arriba).</p><div className="mapa-bivariate-matrix" role="group" aria-label="Matriz bivariada de 25 colores">{[4,3,2,1,0].flatMap(j=>[0,1,2,3,4].map(i=><span key={`${i}-${j}`} style={{backgroundColor:bivariateColor(i,j)}} title={`X${i+1}: ${sx.legend[i].label}; Y${j+1}: ${sy.legend[j].label}`} aria-label={`X${i+1}, Y${j+1}`} />))}</div></div>}
      <div className="mapa-legend">{sx.legend.map((l,i)=><span key={i}><i style={{backgroundColor:l.color}} />{mode==='bivariate'?`X${i+1}: `:''}{l.label} ({l.count})</span>)}<span><i style={{backgroundColor:NO_DATA_COLOR}} />Sin dato</span></div>
      {mode==='bivariate'&&<div className="mapa-legend">{sy.legend.map((l,i)=><span key={i}>Y{i+1}: {l.label} ({l.count})</span>)}</div>}
      <div className="mapa-content"><div className="mapa-map-panel">{!dataset&&<p>Carga un Excel con datos para colorear el mapa. Se admiten porcentajes de Excel y textos como 25%.</p>}<div ref={mapRef} className="mapa-svg-wrapper" dangerouslySetInnerHTML={SVG_HTML} /></div>
      <section className="mapa-ranking-panel"><h4>Máximos y mínimos · {x?.label||'Indicador'}</h4><p>Municipios de la región; colores del mapa{mode==='bivariate'?' bivariado':''}.</p>
        {[{title:'10 valores mayores',rows:ranked.slice(-10).reverse()},{title:'10 valores menores',rows:ranked.slice(0,10)}].map(group=><div className="mapa-ranking" key={group.title}><h5>{group.title}</h5><ul>{group.rows.map(r=><li key={r.id} className="mapa-rank-item"><span className="mapa-rank-swatch" style={{backgroundColor:getColor(r)}} /><span>{r.name}</span><strong>{format(r.x,x?.percent)}</strong></li>)}</ul></div>)}{!ranked.length&&<p>No hay valores numéricos en la región seleccionada.</p>}</section></div>
    </div><div ref={tooltipRef} className="mapa-tooltip" />
  </div>;
}
