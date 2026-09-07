export const PALETTES = {
  institucional: { label: 'Institucional', colors: ['#f3e8df', '#ddbc9b', '#bb876e', '#a54c55', '#9f2241'] },
  azules: { label: 'Azules', colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'] },
  verdes: { label: 'Verdes', colors: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'] },
  viridis: { label: 'Violeta a amarillo', colors: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'] },
};
export const NO_DATA_COLOR = '#d1d5db';
export function buildScale(values, { palette = 'institucional', method = 'quantiles', cuts = '', reverse = false } = {}) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  const colors = [...PALETTES[palette].colors];
  if (reverse) colors.reverse();
  let thresholds = [];
  let error = '';
  if (method === 'manual') {
    thresholds = cuts.split(';').map(v => v.trim()).map(v => v === '' ? NaN : Number(v));
    if (thresholds.length !== 4 || thresholds.some((v, i) => !Number.isFinite(v) || (i > 0 && v <= thresholds[i - 1]))) {
      error = 'Escribe cuatro límites numéricos en orden creciente, separados por punto y coma.';
    }
  } else if (nums.length) {
    for (let i = 1; i < colors.length; i++) {
      thresholds.push(method === 'equal' ? nums[0] + (nums.at(-1) - nums[0]) * i / colors.length : nums[Math.ceil(i * nums.length / colors.length) - 1]);
    }
    thresholds = [...new Set(thresholds)].filter(v => v < nums.at(-1));
  }
  const color = value => {
    if (!Number.isFinite(value) || !nums.length || error) return NO_DATA_COLOR;
    return colors[thresholds.filter(t => value > t).length];
  };
  const fmt = n => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(n);
  const legend = error || !nums.length ? [] : Array.from({ length: thresholds.length + 1 }, (_, i) => ({
    color: colors[i],
    label: !thresholds.length ? `Todos: ${fmt(nums[0])}` : i === 0 ? `≤ ${fmt(thresholds[0])}` : i === thresholds.length ? `> ${fmt(thresholds[i - 1])}` : `> ${fmt(thresholds[i - 1])} y ≤ ${fmt(thresholds[i])}`,
  }));
  return { color, legend, error };
}
