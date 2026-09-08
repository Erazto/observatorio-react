export const normalizeMunicipality = (value = '') => String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toUpperCase();
export const parseMapNumber = value => {
  if(value==null || typeof value==='boolean' || String(value).trim()==='') return null;
  let text=String(value).trim();
  const percent=text.endsWith('%');
  if(percent) text=text.slice(0,-1).trim();
  if(percent && /^[-+]?\d+,\d+$/.test(text)) text=text.replace(',','.');
  else text=text.replace(/,/g,'');
  const number=Number(text);
  return Number.isFinite(number)?number:null;
};
const NAME_HEADERS=['NOMBRE_DEL_MUNICIPIO','MUNICIPIO','NOMBRE_MUNICIPIO'];
export function inspectMapGrid(input) {
  const start=input.findIndex(row=>row.some(v=>NAME_HEADERS.includes(normalizeMunicipality(v))));
  if(start<0) throw new Error('Agrega una columna MUNICIPIO o NOMBRE DEL MUNICIPIO.');
  const grid=input.slice(start);
  const headers=grid[0].map(v=>String(v??'').trim());
  const names=headers.map(normalizeMunicipality);
  const nombre=names.findIndex(v=>NAME_HEADERS.includes(v));
  const cve=names.findIndex(v=>['CVE_MUN','CLAVE_MUNICIPIO'].includes(v));
  const rows=grid.slice(1).filter(r=>String(r[nombre]??'').trim());
  const seen=new Set();
  rows.forEach(r=>{const key=normalizeMunicipality(r[nombre]);if(seen.has(key)) throw new Error(`Municipio repetido: ${r[nombre]}. Usa una fila por municipio.`);seen.add(key);});
  const metrics=headers.map((name,idx)=>({id:String(idx),name,idx})).filter(c=>c.idx!==nombre&&c.idx!==cve&&c.name&&rows.some(r=>parseMapNumber(r[c.idx])!==null));
  if(!metrics.length) throw new Error('Completa al menos una columna con números o porcentajes. La plantilla vacía no contiene indicadores.');
  metrics.forEach(c=>{
    if(metrics.filter(other=>other.name===c.name).length>1) c.label=`${c.name} (columna ${c.idx+1})`;else c.label=c.name;
    const cells=rows.map(r=>r[c.idx]).filter(v=>parseMapNumber(v)!==null);
    c.percent=cells.some(v=>String(v).trim().endsWith('%'));
    if(c.percent && cells.some(v=>!String(v).trim().endsWith('%'))) throw new Error(`La columna ${c.name} mezcla porcentajes y números sin unidad. Aplica el mismo formato a toda la columna.`);
  });
  return {grid:[headers,...rows],metrics,nombre,cve};
}
export function worksheetGrid(XLSX,sheet) {
  const grid=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  const range=XLSX.utils.decode_range(sheet['!ref']||'A1');
  grid.forEach((row,r)=>row.forEach((value,c)=>{
    const cell=sheet[XLSX.utils.encode_cell({r:r+range.s.r,c:c+range.s.c})];
    if(cell?.t==='n' && /%/.test(cell.w||cell.z||'')) row[c]=`${cell.v*100}%`;
  }));
  return grid;
}

// No se buscan hojas alternativas: el usuario prepara sus datos en la primera.
export function readFirstMapSheet(XLSX, workbook) {
  const name = workbook.SheetNames[0];
  if (!name) throw new Error('El archivo no contiene hojas.');
  try {
    return { name, data: inspectMapGrid(worksheetGrid(XLSX, workbook.Sheets[name])) };
  } catch (error) {
    throw new Error(`Revisa la primera hoja del Excel (${name}): ${error.message}`);
  }
}
