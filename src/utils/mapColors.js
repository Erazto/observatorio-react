// Colores de las referencias convertidos a sRGB. Los JPG pueden variar ligeramente por compresión.
export const PALETTES = {
  institucional: { label: 'Institucional', reference: true, background: '#FFFFFF', heading: '#54212C', colors: ['#C4B18F', '#BC965B', '#965F36', '#9F2141', '#54212C'] },
  marginacion: { label: 'Rosas', reference: true, background: '#CDAEB8', heading: '#3C0318', colors: ['#FFDBD8', '#F6C3CF', '#C6667F', '#5F1729', '#3C0318'] },
  pobreza: { label: 'Naranjas', reference: true, background: '#CFBAA5', heading: '#42061B', colors: ['#FFF0DF', '#FDD0A2', '#FDA45B', '#E87524', '#A94708'] },
  resiliencia: { label: 'Morados', reference: true, background: '#B5B4C4', heading: '#212029', colors: ['#F0F0F2', '#BFBFBF', '#A4A1B8', '#4F4C64', '#212029'] },
  resiliencia_aqua: { label: 'Aqua', reference: true, background: '#95BBB8', heading: '#174C44', description: 'Cinco tonos inspirados en la referencia de resiliencia. Esta gama es una adaptación para valores ordenados; no representa las categorías del clúster.', colors: ['#DFEFE5', '#78CCB4', '#6A8DA0', '#249383', '#1A6D63'] },
  categoria1: { label: 'Verde', background: '#F8FAFC', heading: '#56212F', colors: ['#EDF7F0', '#CDE9D6', '#61BA7D', '#245232', '#16321F'] },
  verde_oliva: { label: 'Lilas', background: '#F8FAFC', heading: '#31451D', colors: ['#F2F6E8', '#D5E2B8', '#A6BF78', '#6F8C43', '#3D5726'] },
  lilas: { label: 'Menta', background: '#F8FAFC', heading: '#56212F', colors: ['#F5F0FA', '#DDD0ED', '#B49ACF', '#805BA6', '#48256B'] },
};
export const NO_DATA_COLOR = '#D1D5DB';
// Contraste del contorno según el color final, también después de invertir la gama.
export function municipalityStroke(fill) {
  const rgb=fill.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if(!rgb)return '#475569';
  const linear=rgb.slice(1).map(value=>{
    const channel=parseInt(value,16)/255;
    return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4;
  });
  const luminance=linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
  return luminance<0.22?'#D1D5DB':'#475569';
}
export const METHODS = { quantiles: 'Cuantiles', equal: 'Intervalos iguales', dalenius: 'Dalenius–Hodges' };
export function classBreaks(values, method = 'quantiles') {
  const nums = values.filter(Number.isFinite).sort((a,b) => a-b);
  if (!nums.length) return [];
  const min = nums[0], max = nums.at(-1);
  if (min === max) return Array(4).fill(min);
  if (method === 'quantiles') return [1,2,3,4].map(i => nums[Math.ceil(i * nums.length / 5) - 1]);
  if (method === 'equal') return [1,2,3,4].map(i => min + (max-min)*i/5);
  // Dalenius–Hodges: histograma de intervalos iguales, acumulación de sqrt(f)
  // y cuatro cortes interpolados a 1/5, 2/5, 3/5 y 4/5 de la suma.
  const bins = Math.max(5, Math.min(100, Math.ceil(Math.sqrt(nums.length))));
  const width = (max-min)/bins;
  const freq = Array(bins).fill(0);
  nums.forEach(v => freq[Math.min(bins-1, Math.floor((v-min)/width))]++);
  const roots = freq.map(Math.sqrt);
  const total = roots.reduce((a,b) => a+b,0);
  return [1,2,3,4].map(i => {
    const target = total*i/5;
    let sum = 0;
    for(let j=0;j<bins;j++) {
      if (roots[j] && sum+roots[j] >= target) return min + width*(j+(target-sum)/roots[j]);
      sum += roots[j];
    }
    return max;
  });
}
export function buildScale(values, {palette='categoria1',method='quantiles',reverse=false,percent=false}={}) {
  const nums = values.filter(Number.isFinite);
  const colors = [...(PALETTES[palette] || PALETTES.categoria1).colors];
  if(reverse) colors.reverse();
  const thresholds = classBreaks(nums,method);
  const index = v => !Number.isFinite(v) || !nums.length ? -1 : thresholds.filter(t => v > t).length;
  const color = v => index(v)<0 ? NO_DATA_COLOR : colors[index(v)];
  const fmt = v => `${new Intl.NumberFormat('es-MX',{maximumFractionDigits:4}).format(v)}${percent?'%':''}`;
  const legend = colors.map((color,i) => ({color, label: !nums.length ? `Clase ${i+1}: sin datos` : i===0 ? `≤ ${fmt(thresholds[0])}` : i===4 ? `> ${fmt(thresholds[3])}` : thresholds[i]===thresholds[i-1] ? 'Intervalo vacío (empates)' : `> ${fmt(thresholds[i-1])} y ≤ ${fmt(thresholds[i])}`, count: nums.filter(v=>index(v)===i).length}));
  return {color,index,legend,colors,thresholds,error:''};
}
export function pearson(pairs) {
  const valid = pairs.filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y));
  const n=valid.length;
  if(n<3) return {n,r:null,reason:'Se necesitan al menos tres municipios con datos en ambas columnas.'};
  const mx=valid.reduce((a,p)=>a+p[0],0)/n, my=valid.reduce((a,p)=>a+p[1],0)/n;
  let xx=0,yy=0,xy=0;
  valid.forEach(([x,y])=>{xx+=(x-mx)**2;yy+=(y-my)**2;xy+=(x-mx)*(y-my);});
  if(!xx||!yy) return {n,r:null,reason:'La correlación no está definida cuando una columna es constante.'};
  return {n,r:Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy)))};
}
export function bivariateColor(x,y) {
  // Ejes verde (X) y violeta (Y); multiplicación de canales RGB.
  if(x<0||y<0) return NO_DATA_COLOR;
  const green=PALETTES.categoria1.colors[x];
  const purple=['#f5f0fa','#ddd0ed','#b49acf','#805ba6','#48256b'][y];
  return '#'+[1,3,5].map(i=>Math.round(parseInt(green.slice(i,i+2),16)*parseInt(purple.slice(i,i+2),16)/255).toString(16).padStart(2,'0')).join('');
}
