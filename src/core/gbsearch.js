// GB Search: محرك بحث GB. يجيب النتائج من DuckDuckGo (البحث الآمن مقفول على "صارم")
// ويعرضها بواجهة التطبيق، ويشيل أي نتيجة لموقع إباحي قبل ما تطلع.
import { isAdult } from './safety';

export const SEARCH_PREFIX = 'gb://search?q=';
export const isSearchPage = (url) => typeof url === 'string' && url.startsWith(SEARCH_PREFIX);
export const searchPageURL = (q) => SEARCH_PREFIX + encodeURIComponent(String(q || '').trim());
export function queryOf(url) {
  try { return decodeURIComponent(String(url).slice(SEARCH_PREFIX.length)); } catch { return ''; }
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" };
const decode = (s) => String(s || '')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (ENT[e.toLowerCase()] !== undefined) return ENT[e.toLowerCase()];
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return m;
  });
const text = (html) => decode(String(html || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function realURL(href) {
  let h = decode(href || '');
  if (h.startsWith('//')) h = 'https:' + h;
  try {
    const u = new URL(h);
    if (/duckduckgo\.com$/.test(u.hostname) && u.pathname.startsWith('/l/')) return u.searchParams.get('uddg') || '';
    return u.toString();
  } catch { return ''; }
}

// Pulls results out of DuckDuckGo's lightweight HTML page.
export function parseResults(html) {
  const out = [];
  const blocks = String(html || '').split(/<div[^>]+class="[^"]*\bresult\b/).slice(1);
  for (const b of blocks) {
    if (/result--ad|badge--ad/.test(b.slice(0, 300))) continue;
    const a = b.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/) ||
              b.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const url = realURL(a[1]);
    if (!/^https?:/.test(url) || isAdult(url)) continue;
    const sn = b.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(a|div|td)>/);
    out.push({ url, title: text(a[2]) || url, snippet: sn ? text(sn[1]) : '' });
  }
  return out;
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export async function search(q, { lang = 'ar', offset = 0 } = {}) {
  const params = `q=${encodeURIComponent(q)}&kp=1&kl=${lang === 'ar' ? 'xa-ar' : 'wt-wt'}${offset ? `&s=${offset}&dc=${offset + 1}` : ''}`;
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, 'Accept-Language': lang === 'ar' ? 'ar,en;q=0.8' : 'en' },
    body: params,
  });
  if (!res.ok) throw new Error('http ' + res.status);
  return parseResults(await res.text());
}

// Full DuckDuckGo pages (safe search on) for images, videos, news and maps.
export const verticalURL = (q, kind) => {
  const base = `https://duckduckgo.com/?q=${encodeURIComponent(q)}&kp=1`;
  return { images: base + '&iax=images&ia=images', videos: base + '&iax=videos&ia=videos', news: base + '&iar=news&ia=news', maps: base + '&iaxm=maps', web: base }[kind] || base;
};
