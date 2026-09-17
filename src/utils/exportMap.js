export async function exportMapPNG(svg, {selected=[],title,legend,method}) {
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
  clone.setAttribute('width','1000');clone.setAttribute('height','900');
  clone.style.background='transparent';
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
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('El navegador no permite exportar imágenes.');
    // Medir y envolver en lugar de comprimir textos largos hasta hacerlos ilegibles.
    const wrap=(text,width,font)=>{
      ctx.font=font;
      const lines=[];let line='';
      for(const word of String(text||'').trim().split(/\s+/)){
        if(line&&ctx.measureText(`${line} ${word}`).width>width){lines.push(line);line='';}
        if(ctx.measureText(word).width<=width){line=line?`${line} ${word}`:word;continue;}
        if(line){lines.push(line);line='';}
        for(const character of word){
          if(line&&ctx.measureText(line+character).width>width){lines.push(line);line='';}
          line+=character;
        }
      }
      if(line)lines.push(line);
      return lines;
    };
    const titleFont='bold 36px sans-serif',creditFont='28px sans-serif',legendFont='22px sans-serif';
    const titleLines=wrap(title,1500,titleFont);
    const credit=`Diseño realizado en el Observatorio Educativo del Estado de México. ISCEEM (${new Date().getFullYear()})`;
    const creditLines=wrap(credit,1500,creditFont);
    const headerBottom=40+titleLines.length*44+12+creditLines.length*36;
    const mapTop=headerBottom+28;
    const entries=legend.map(item=>({...item,lines:wrap(item.label,390,legendFont)}));
    const methodLines=method?wrap(`Método de Estratificación: ${method}`,430,legendFont):[];
    const legendHeight=40+methodLines.length*28+(methodLines.length?16:0)+entries.reduce((height,item)=>height+Math.max(28,item.lines.length*28)+12,0);
    const mapHeight=Math.max(900,legendHeight+40);
    canvas.height=mapTop+mapHeight+40;
    // El lienzo conserva su canal alfa: no se pinta un rectángulo de fondo.
    ctx.fillStyle='#56212f';ctx.font=titleFont;
    let y=40;
    for(const line of titleLines){ctx.fillText(line,50,y+34);y+=44;}
    y+=12;ctx.font=creditFont;
    for(const line of creditLines){ctx.fillText(line,50,y+28);y+=36;}
    ctx.drawImage(img,50,mapTop,1000,mapHeight);
    // Espacio reservado a la derecha para evitar tapar municipios de cualquier región.
    const legendX=1100;
    y=mapTop+mapHeight-legendHeight;
    ctx.fillStyle='#56212f';ctx.font='bold 24px sans-serif';
    ctx.fillText('Acotaciones',legendX,y+26);y+=40;
    ctx.font=legendFont;ctx.fillStyle='#334155';
    for(const line of methodLines){ctx.fillText(line,legendX,y+22);y+=28;}
    if(methodLines.length)y+=16;
    for(const item of entries){
      ctx.fillStyle=item.color;ctx.fillRect(legendX,y+3,24,24);
      ctx.strokeStyle='#666';ctx.strokeRect(legendX,y+3,24,24);
      ctx.fillStyle='#222';ctx.font=legendFont;
      item.lines.forEach((line,index)=>ctx.fillText(line,legendX+40,y+22+index*28));
      y+=Math.max(28,item.lines.length*28)+12;
    }
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('No fue posible crear el archivo PNG.');
    const download=URL.createObjectURL(blob);const a=document.createElement('a');a.href=download;a.download='mapa_region_edomex.png';a.click();setTimeout(()=>URL.revokeObjectURL(download),1000);
  } finally {if(url)URL.revokeObjectURL(url);}
}
