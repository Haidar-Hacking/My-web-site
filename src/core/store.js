// تخزين بيانات المتصفح على الجهاز (AsyncStorage) مع اشتراك بسيط لتحديث الواجهة
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { normalize, uid } from './logic';

const DEFAULTS = {
  settings: {
    lang: 'ar',
    theme: 'system',
    accent: 'lapis',
    engine: 'google',
    suggestions: true,
    shield: true,
    popups: true,
    darkSites: false,
    textSize: 100,
    digits: 'arab',
    weather: true,
    city: 'Baghdad',
    wisdom: true,
    haptics: true,
    readerTheme: 'light',
    readerSize: 19,
    readerSerif: false,
  },
  shortcuts: [
    { title: 'Google', url: 'https://www.google.com' },
    { title: 'YouTube', url: 'https://m.youtube.com' },
    { title: 'Facebook', url: 'https://m.facebook.com' },
    { title: 'Instagram', url: 'https://www.instagram.com' },
    { title: 'Wikipedia', url: 'https://ar.m.wikipedia.org' },
    { title: 'Gmail', url: 'https://mail.google.com' },
    { title: 'X', url: 'https://x.com' },
    { title: 'Telegram', url: 'https://web.telegram.org' },
  ],
  bookmarks: [],
  history: [],
  readLater: [],
  stats: { blocked: 0, since: Date.now() },
  session: { tabs: [], active: 0 },
  siteAllow: [],
};

const state = JSON.parse(JSON.stringify(DEFAULTS));
const subs = new Set();
const timers = {};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  if (!isObj(over)) return Array.isArray(base) && Array.isArray(over) ? over : base;
  for (const k of Object.keys(over)) base[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k];
  return base;
}

export async function loadStore() {
  const keys = Object.keys(DEFAULTS);
  try {
    const pairs = await AsyncStorage.multiGet(keys.map((k) => 'gb.' + k));
    for (const [full, raw] of pairs) {
      const key = full.slice(3);
      if (!raw) continue;
      try {
        const saved = JSON.parse(raw);
        state[key] = Array.isArray(DEFAULTS[key]) ? (Array.isArray(saved) ? saved : state[key]) : merge(JSON.parse(JSON.stringify(DEFAULTS[key])), saved);
      } catch { /* keep default */ }
    }
  } catch { /* storage unavailable: run with defaults */ }
}

export const get = (key) => state[key];

export function set(key, value) {
  state[key] = value;
  subs.forEach((fn) => fn(key));
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    AsyncStorage.setItem('gb.' + key, JSON.stringify(state[key])).catch(() => {});
  }, 300);
}

export function setSetting(key, value) {
  set('settings', { ...state.settings, [key]: value });
}

export function useData(key) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = (k) => { if (k === key) force((x) => x + 1); };
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, [key]);
  return state[key];
}

export const useSettings = () => useData('settings');

export const History = {
  add({ url, title }) {
    if (!/^https?:/.test(url || '')) return;
    const list = state.history.slice();
    const now = Date.now();
    if (list[0] && list[0].url === url && now - list[0].ts < 30 * 60 * 1000) {
      list[0] = { ...list[0], title: title || list[0].title, ts: now };
    } else {
      const i = list.findIndex((h) => h.url === url);
      const n = i >= 0 ? (list[i].n || 1) + 1 : 1;
      if (i >= 0) list.splice(i, 1);
      list.unshift({ url, title: String(title || '').slice(0, 200), ts: now, n });
    }
    if (list.length > 2000) list.length = 2000;
    set('history', list);
  },
  query(text, limit = 8) {
    const q = normalize(text);
    if (!q) return state.history.slice(0, limit);
    const out = [];
    for (const h of state.history) {
      if (normalize(h.title).includes(q) || h.url.toLowerCase().includes(q)) {
        out.push(h);
        if (out.length >= limit) break;
      }
    }
    return out;
  },
  remove(url) { set('history', state.history.filter((h) => h.url !== url)); },
  clear() { set('history', []); },
};

export const Bookmarks = {
  has: (url) => state.bookmarks.some((b) => b.url === url),
  toggle(url, title) {
    if (Bookmarks.has(url)) { set('bookmarks', state.bookmarks.filter((b) => b.url !== url)); return false; }
    set('bookmarks', [{ id: uid(), url, title: title || url, ts: Date.now() }, ...state.bookmarks]);
    return true;
  },
  remove(id) { set('bookmarks', state.bookmarks.filter((b) => b.id !== id)); },
};

export const ReadLater = {
  add(url, title) {
    set('readLater', [{ id: uid(), url, title: title || url, ts: Date.now(), read: false }, ...state.readLater.filter((x) => x.url !== url)].slice(0, 300));
  },
  remove(id) { set('readLater', state.readLater.filter((x) => x.id !== id)); },
  mark(id, read) { set('readLater', state.readLater.map((x) => (x.id === id ? { ...x, read } : x))); },
};

export function addBlocked(n) {
  set('stats', { ...state.stats, blocked: (state.stats.blocked || 0) + n });
}
