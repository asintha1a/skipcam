import { historyValue, inspect } from './content-type.js';

export const defaults = { theme: 'system', remember: false, days: 30, motion: 'system', size: 512, level: 'M', foreground: '#111111', background: '#ffffff' };

export function cleanHistory(items, settings, now = Date.now()) {
  if (!settings.remember || !Array.isArray(items)) return [];
  const days = [1, 7, 30, 90].includes(settings.days) ? settings.days : 30;
  return items.filter(item => item && Number.isFinite(item.at) && item.at > now - days * 86400000 &&
    typeof item.value === 'string' && historyValue(inspect(item.value)) === item.value).slice(0, 200);
}

export function createStore(storage) {
  let queue = Promise.resolve();
  return (action = {}) => {
    const response = queue.then(async () => {
      const data = await storage.get(['settings', 'history']);
      const settings = { ...defaults, ...data.settings, ...action.settings };
      let history = cleanHistory(data.history, settings);
      if (action.clear) history = [];
      if (action.remove) history = history.filter(item => item.id !== action.remove);
      if (settings.remember && action.results) {
        const entries = [...new Set(action.results.map(raw => historyValue(inspect(raw))).filter(Boolean))];
        history = [...entries.map(value => ({ id: crypto.randomUUID(), value, at: Date.now(), type: 'URL' })), ...history].slice(0, 200);
      }
      if (action.settings || JSON.stringify(history) !== JSON.stringify(data.history ?? [])) await storage.set({ settings, history });
      return { settings, history };
    });
    queue = response.catch(() => {});
    return response;
  };
}
