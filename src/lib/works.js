// works.js —— 我的作品（localStorage，7 天有效）
const KEY = 'xperience_works_v1';
const TTL = 7 * 86400000;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } return list; };
export function listWorks() { return read().filter((w) => Date.now() < w.expiresAt).sort((a, b) => b.at - a.at); }
export function addWork({ type, title, url, duration }) {
  const w = { id: `w_${Date.now()}`, type, title, url, duration, at: Date.now(), expiresAt: Date.now() + TTL };
  write([w, ...read()].slice(0, 20));
  return w;
}
export function removeWork(id) { return write(read().filter((w) => w.id !== id)); }
export function clearWorks() { return write([]); }
export function daysLeft(expiresAt) { return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)); }
