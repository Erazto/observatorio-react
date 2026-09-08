export async function exportMapPNG(svg, {selected=[],title,legend,notes=[]}) {
  const clone=svg.cloneNode(true);
  const paths=[...svg.querySelectorAll('path[id]')];
  const chosen=selected.length ? paths.filter(p=>selected.includes(p.id)) : paths;
  if(!chosen.length) throw new Error('Selecciona al menos un municipio presente en el mapa.');
  if(selected.length) clone.querySelectorAll('path[id]').forEach(p=>{if(!selected.includes(p.id))p.remove();});
  clone.querySelectorAll('path[id]').forEach(p=>{p.style.opacity='1';p.removeAttribute('tabindex');});
  const boxes=chosen.map(p=>p.getBBox());
  const left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y));
  const right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
  clone.setAttribute('viewBox',`${left-10} ${top-10} ${right-left+20} ${bottom-top+20}`);
  clone.setAttribute('width','1400');clone.setAttribute('height','1000');
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  let url;
  try {
    url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(new Error('La exportación tardó demasiado.'));},15000);
      img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(new Error('No fue posible generar el PNG.'));};img.src=url;
    });
    const canvas=document.createElement('canvas');canvas.width=1600;
    const lines=legend.length+notes.length;
    canvas.height=1180+lines*28+90;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('El navegador no permite exportar imágenes.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#56212f';ctx.font='bold 26px sans-serif';ctx.fillText(title.replace(/\s+/g,' '),50,48,1500);
    ctx.drawImage(img,100,80,1400,1000);
    let y=1130;ctx.font='18px sans-serif';
    for(const item of legend){ctx.fillStyle=item.color;ctx.fillRect(50,y-16,22,22);ctx.strokeStyle='#666';ctx.strokeRect(50,y-16,22,22);ctx.fillStyle='#222';ctx.fillText(item.label,85,y,1450);y+=28;}
    for(const note of notes){ctx.fillStyle='#334155';ctx.fillText(note.replace(/\s+/g,' '),50,y,1500);y+=28;}
    ctx.textAlign='right';ctx.font='18px sans-serif';ctx.fillStyle='#56212f';
    ctx.fillText(`Diseño realizado en el Observatorio Educativo del Estado de México. ISCEEM (${new Date().getFullYear()})`,1550,canvas.height-30,1500);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('No fue posible crear el archivo PNG.');
    const download=URL.createObjectURL(blob);const a=document.createElement('a');a.href=download;a.download='mapa_region_edomex.png';a.click();setTimeout(()=>URL.revokeObjectURL(download),1000);
  } finally {if(url)URL.revokeObjectURL(url);}
}
