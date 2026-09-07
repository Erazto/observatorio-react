export const USAGE_KEY = 'observatorio:mapa:uso:v1';
export const EMPTY_USAGE = { visitas: 0, cargas: 0, visualizaciones: 0 };
export function readUsage(storage) {
  try {
    const value = JSON.parse(storage.getItem(USAGE_KEY));
    return Object.fromEntries(Object.keys(EMPTY_USAGE).map(key => [key, Number.isSafeInteger(value?.[key]) && value[key] >= 0 ? value[key] : 0]));
  } catch { return { ...EMPTY_USAGE }; }
}
export function incrementUsage(current, events) {
  const next = { ...current };
  for (const event of events) if (Object.hasOwn(EMPTY_USAGE, event)) next[event] += 1;
  return next;
}
