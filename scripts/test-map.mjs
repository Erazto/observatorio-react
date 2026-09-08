import fs from 'node:fs';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
const load=path=>import('data:text/javascript;base64,'+fs.readFileSync(path).toString('base64'));
const {parseMapNumber,inspectMapGrid,worksheetGrid,normalizeMunicipality,readFirstMapSheet}=await load('src/utils/mapData.js');
const {classBreaks,buildScale,pearson,bivariateColor,PALETTES,NO_DATA_COLOR}=await load('src/utils/mapColors.js');
assert.equal(parseMapNumber('25%'),25);
assert.equal(parseMapNumber('12,5%'),12.5);
assert.equal(parseMapNumber('  '),null);
assert.equal(parseMapNumber('0%'),0);
assert.equal(parseMapNumber('1,200.5'),1200.5);
const ws=XLSX.utils.aoa_to_sheet([['Título del archivo'],['Municipio','Porcentaje Excel','Porcentaje texto'],['Toluca',.255,'25.5%'],['Metepec',0,'0%']]);
ws.B3.z='0.0%';ws.B4.z='0%';
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Datos');
const roundtrip=XLSX.read(XLSX.write(wb,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellNF:true});
const parsed=inspectMapGrid(worksheetGrid(XLSX,roundtrip.Sheets.Datos));
assert.equal(parsed.metrics.length,2);assert(parsed.metrics.every(m=>m.percent));
assert.equal(parseMapNumber(parsed.grid[1][1]),25.5);
assert.equal(parseMapNumber(parsed.grid[2][1]),0);
const duplicate=inspectMapGrid([['Municipio','Dato','Dato'],['Toluca',1,2]]);
assert.notEqual(duplicate.metrics[0].label,duplicate.metrics[1].label);
assert.notEqual(duplicate.metrics[0].id,duplicate.metrics[1].id);
assert.throws(()=>inspectMapGrid([['Municipio','Dato'],['Toluca','20%'],['Metepec',20]]),/mezcla/);
assert.throws(()=>inspectMapGrid([['Municipio','Dato'],['Toluca',1],['TOLUCA',2]]),/repetido/);
for(const method of ['quantiles','equal','dalenius']){
 for(const values of [[],[4],[4,4,4],[-100,0,10,100],[1,1,1,2,3,7,20,100]]){
  const scale=buildScale(values,{method});assert.equal(scale.legend.length,5);
  assert.equal(scale.color(null),NO_DATA_COLOR);
  assert.equal(scale.legend.reduce((a,b)=>a+b.count,0),values.length);
  for(const value of values)assert(scale.colors.includes(scale.color(value)));
  assert(scale.thresholds.every((t,i)=>!i||t>=scale.thresholds[i-1]));
 }
}
const uniform=Array.from({length:100},(_,i)=>i);
classBreaks(uniform,'dalenius').forEach((cut,i)=>assert(Math.abs(cut-99*(i+1)/5)<1e-8));
assert.equal(pearson([[1,2],[2,4],[3,6]]).r,1);
assert.equal(pearson([[1,6],[2,4],[3,2]]).r,-1);
assert.equal(pearson([[-1,1],[0,0],[1,1]]).r,0);
assert.equal(pearson([[1,1],[1,2],[1,3]]).r,null);
assert.equal(pearson([[1,1],[2,null],[3,3]]).r,null);
assert.equal(pearson([[1,1],[2,2],[3,3],[4,null]]).n,3);
assert.equal(bivariateColor(-1,1),NO_DATA_COLOR);
assert.equal(new Set(Array.from({length:25},(_,i)=>bivariateColor(i%5,Math.floor(i/5)))).size,25);
assert.deepEqual(PALETTES.categoria1.colors,['#EDF7F0','#CDE9D6','#61BA7D','#245232','#16321F']);
const real=XLSX.readFile('public/data/BD_municipios_matricula_MS.xlsx',{cellNF:true});
assert.equal(inspectMapGrid(worksheetGrid(XLSX,real.Sheets[real.SheetNames[0]])).metrics.length,11);
const svg=fs.readFileSync('src/modules/mapa-interactivo/MapaMunicipios_2.svg','utf8');
const ids=[...svg.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)].map(m=>normalizeMunicipality(m[1]));
assert.equal(ids.length,125);
assert(ids.includes('TOLUCA'));assert(ids.includes('METEPEC'));
console.log('OK: Excel porcentual nativo/texto, encabezados desplazados/duplicados, validación, 5 clases, Dalenius–Hodges, Pearson, matriz bivariada y 125 municipios.');

// Revisión previa a publicación: cinco gamas, inversión y barras compartidas.
assert.equal(Object.keys(PALETTES).length,5);
for(const palette of Object.keys(PALETTES)) {
  const forward=buildScale([0,25,50,75,100],{palette});
  const reverse=buildScale([0,25,50,75,100],{palette,reverse:true});
  assert.deepEqual(reverse.colors,[...forward.colors].reverse());
  assert.equal(reverse.color(null),NO_DATA_COLOR);
  assert.deepEqual(reverse.thresholds,forward.thresholds);
}
const {buildRankingBars}=await load('src/utils/rankingBars.js');
assert.equal(buildRankingBars([0,25,100])(25).width,25);
assert.equal(buildRankingBars([0,0])(0).width,0);
assert.equal(buildRankingBars([5,5])(5).width,100);
assert.deepEqual(buildRankingBars([-100,0,100])(-100),{left:0,width:50,zero:50});
console.log('OK: cinco gamas, inversión sin alterar cortes y barras con ceros, empates y negativos.');

const multipleSheets=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(multipleSheets,XLSX.utils.aoa_to_sheet([['Municipio','Dato'],['Toluca',25]]),'Principal');
XLSX.utils.book_append_sheet(multipleSheets,XLSX.utils.aoa_to_sheet([['Municipio','Dato'],['Toluca',99]]),'Otra');
assert.equal(readFirstMapSheet(XLSX,multipleSheets).data.grid[1][1],25);
multipleSheets.Sheets.Principal=XLSX.utils.aoa_to_sheet([['Sin datos']]);
assert.throws(()=>readFirstMapSheet(XLSX,multipleSheets),/primera hoja/);
assert.throws(()=>readFirstMapSheet(XLSX,{SheetNames:[]}),/no contiene hojas/);
console.log('OK: solo primera hoja; error explícito sin buscar datos en otras hojas.');
