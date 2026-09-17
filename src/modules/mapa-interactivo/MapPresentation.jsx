import React, { forwardRef, useEffect, useImperativeHandle, useRef, useId } from 'react';
import './mapPresentation.css';

const MapPresentation=forwardRef(function MapPresentation({themeStyle,title,selected,legend,method,ranked,color,formatValue,rankingBar,minimumBar},ref){
  const dialogRef=useRef(null),sheetRef=useRef(null),mapRef=useRef(null),triggerRef=useRef(null),nativeRef=useRef(false),overflowRef=useRef('');
  const tooltipRef=useRef(null),tooltipId=useId();
  const hideTooltip=()=>{if(tooltipRef.current)tooltipRef.current.hidden=true;};
  const showTooltip=(path,left,top)=>{
    const tooltip=tooltipRef.current;
    tooltip.textContent=path.getAttribute('aria-label')||path.dataset.municipality.replace(/_/g,' ');
    tooltip.hidden=false;
    tooltip.style.left=`${Math.max(8,Math.min(left+12,window.innerWidth-tooltip.offsetWidth-8))}px`;
    tooltip.style.top=`${Math.max(8,Math.min(top+12,window.innerHeight-tooltip.offsetHeight-8))}px`;
  };
  const close=()=>{
    hideTooltip();
    const dialog=dialogRef.current;
    if(!dialog?.open)return;
    dialog.close();
    document.body.style.overflow=overflowRef.current;
    if(document.fullscreenElement===sheetRef.current)document.exitFullscreen().catch(()=>{});
    nativeRef.current=false;
    mapRef.current.replaceChildren();
    triggerRef.current?.focus();
  };
  useEffect(()=>{
    const onFullscreen=()=>{
      if(document.fullscreenElement===sheetRef.current)nativeRef.current=true;
      else if(nativeRef.current)close();
    };
    document.addEventListener('fullscreenchange',onFullscreen);
    return ()=>{document.removeEventListener('fullscreenchange',onFullscreen);close();};
  },[]);
  useImperativeHandle(ref,()=>({open(svg){
    if(!svg||dialogRef.current.open)return;
    const clone=svg.cloneNode(true);
    const paths=[...svg.querySelectorAll('path[id]')].filter(p=>!selected.length||selected.includes(p.id));
    if(!paths.length)return;
    const boxes=paths.map(p=>p.getBBox());
    const left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y));
    const right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
    clone.querySelectorAll('path[id]').forEach(p=>{
      if(selected.length&&!selected.includes(p.id)){p.remove();return;}
      p.dataset.municipality=p.id;p.style.opacity='1';p.style.cursor='default';
      p.setAttribute('tabindex','0');p.setAttribute('role','img');p.removeAttribute('aria-pressed');
      p.setAttribute('aria-describedby',tooltipId);
      p.onmouseenter=p.onmousemove=event=>showTooltip(p,event.clientX,event.clientY);
      p.onmouseleave=()=>{if(document.activeElement!==p)hideTooltip();};
      p.addEventListener('blur',hideTooltip);
      const showAtMunicipality=()=>{const box=p.getBoundingClientRect();showTooltip(p,box.left+box.width/2,box.top+box.height/2);};
      p.addEventListener('focus',showAtMunicipality);p.onclick=showAtMunicipality;
      p.onkeydown=event=>{if(event.key==='Escape'&&!tooltipRef.current.hidden){event.preventDefault();event.stopPropagation();hideTooltip();}};
    });
    clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    clone.setAttribute('viewBox',`${left-10} ${top-10} ${right-left+20} ${bottom-top+20}`);
    clone.setAttribute('role','group');clone.setAttribute('aria-label',title);
    mapRef.current.replaceChildren(clone);
    triggerRef.current=document.activeElement;
    overflowRef.current=document.body.style.overflow;document.body.style.overflow='hidden';
    dialogRef.current.showModal();
    // Si el navegador no admite pantalla completa, el diálogo ocupa toda la ventana.
    sheetRef.current.requestFullscreen?.().then(()=>{
      if(!dialogRef.current?.open&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    }).catch(()=>{});
  }}));
  return <dialog ref={dialogRef} className="map-presentation" style={themeStyle} aria-label={`Presentación del mapa: ${title}`} onCancel={event=>{event.preventDefault();close();}}>
    <div ref={sheetRef} className="map-presentation-sheet" style={themeStyle} onScrollCapture={()=>{
      const focused=document.activeElement;
      if(mapRef.current?.contains(focused)&&focused.matches('path[data-municipality]')){
        const box=focused.getBoundingClientRect();showTooltip(focused,box.left+box.width/2,box.top+box.height/2);
      }else hideTooltip();
    }}>
      <div className="map-presentation-heading">
        <div><h2>{title}</h2><p>Diseño realizado en el Observatorio Educativo del Estado de México. ISCEEM ({new Date().getFullYear()})</p></div>
        <button type="button" className="mapa-btn mapa-btn--outline" onClick={close} autoFocus>Salir de presentación ×</button>
      </div>
      <div className="map-presentation-body">
        <div ref={mapRef} className="map-presentation-map" />
        <aside className="map-presentation-details" aria-label="Acotaciones y valores extremos">
          <section className="map-presentation-legend"><h3>Acotaciones</h3><p>Método de Estratificación: {method}</p>
            <ul>{legend.map((item,index)=><li key={index}><i style={{backgroundColor:item.color}} aria-hidden="true"/><span>{item.label}</span></li>)}</ul>
          </section>
          <p className="map-presentation-scale-note">Escala propia en mínimos: con valores positivos, el mayor representa el 100 %. Compara las barras dentro de cada lista.</p>
          <div className="map-presentation-rankings">
            {[{label:'10 valores mayores',rows:ranked.slice(-10).reverse(),bar:rankingBar},{label:'10 valores menores',rows:ranked.slice(0,10),bar:minimumBar}].map(group=><section key={group.label}>
              <h3>{group.label}</h3><ol>{group.rows.map(row=>{
                const bar=group.bar(row.x);
                return <li key={row.id}><div><span>{row.name}</span><strong>{formatValue(row.x)}</strong></div>
                  <div className="map-presentation-bar" aria-hidden="true"><span style={{left:`${bar.left}%`,width:`${bar.width}%`,backgroundColor:color(row)}}/><i style={{left:`${bar.zero}%`}}/></div>
                </li>;
              })}</ol>
            </section>)}
          </div>
        </aside>
      </div>
      <div ref={tooltipRef} id={tooltipId} className="map-presentation-tooltip" role="tooltip" hidden />
    </div>
  </dialog>;
});
export default MapPresentation;
