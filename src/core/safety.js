// حماية العائلة: حجب المواقع الإباحية وفرض البحث الآمن. ما ينطفي من الإعدادات.
const ADULT_SITES = [
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com', 'youporn.com', 'tube8.com', 'spankbang.com',
  'brazzers.com', 'onlyfans.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com', 'cam4.com',
  'myfreecams.com', 'camsoda.com', 'eporner.com', 'tnaflix.com', 'porntrex.com', 'hqporner.com', 'beeg.com', 'txxx.com',
  'hclips.com', 'porn.com', 'youjizz.com', 'motherless.com', 'fapello.com', 'rule34.xxx', 'e-hentai.org', 'nhentai.net',
  'hanime.tv', 'hentaihaven.xxx', 'xvideos2.com', 'xvideos3.com', 'xhamster.desi', 'xhamsterlive.com', 'pornone.com',
  'sxyprn.com', 'noodlemagazine.com', 'thisvid.com', 'efukt.com', 'ixxx.com', 'manyvids.com', 'clips4sale.com',
  'adultfriendfinder.com', 'fansly.com', 'erome.com', 'imagefap.com', 'literotica.com', 'sex.com', 'porndig.com',
  'pornpics.com', 'redgifs.com', 'xtube.com', 'heavy-r.com', 'daftsex.com', 'ok.xxx', 'pornhat.com', 'drtuber.com',
  'nuvid.com', 'sunporno.com', 'fuq.com', 'pornmd.com', 'porn300.com', 'xxxbunker.com', 'luxuretv.com', 'vporn.com',
  'faphouse.com', 'pornhubpremium.com', 'xnxx.tv', 'xvideos.es', 'aznude.com', 'porntube.com', 'fapster.xxx',
];
const SET = new Set(ADULT_SITES);
// Words that only appear in adult site names (chosen to avoid places like Essex or Middlesex).
const WORDS = /(porn|xxx|hentai|xvideo|xnxx|xhamster|redtube|youporn|brazzers|onlyfans|chaturbate|nsfw|camgirl|sexcam|livesex|fetish|milf|nude|nudes|erotic|escort)/;
const ADULT_TLD = /\.(xxx|porn|sex|adult)$/;

export function isAdult(url) {
  let h = '';
  try { h = new URL(url).hostname.toLowerCase(); } catch { return false; }
  if (ADULT_TLD.test(h) || WORDS.test(h)) return true;
  while (h) {
    if (SET.has(h)) return true;
    const i = h.indexOf('.');
    if (i < 0) return false;
    h = h.slice(i + 1);
  }
  return false;
}

// Turns safe search on if someone opens Google or Bing results directly.
export function forceSafeSearch(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const h = u.hostname.replace(/^www\./, '');
  if (/^google\.[a-z.]+$/.test(h) && u.pathname === '/search' && u.searchParams.get('safe') !== 'active') { u.searchParams.set('safe', 'active'); return u.toString(); }
  if (h === 'bing.com' && u.pathname === '/search' && u.searchParams.get('adlt') !== 'strict') { u.searchParams.set('adlt', 'strict'); return u.toString(); }
  if (h === 'duckduckgo.com' && u.searchParams.get('q') && u.searchParams.get('kp') !== '1') { u.searchParams.set('kp', '1'); return u.toString(); }
  return null;
}

export const BLOCKED_PAGE = (lang) => `<!doctype html><html dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;background:linear-gradient(#1B2C74,#0F1840);color:#F4F6FC;font:16px/1.7 -apple-system,"SF Arabic","Noto Sans Arabic",Roboto,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
.c{max-width:340px}.i{width:76px;height:76px;margin:0 auto 18px;border-radius:24px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:38px}
h1{font-size:22px;margin:0 0 8px}p{margin:0;color:rgba(244,246,252,.8)}</style></head>
<body><div class="c"><div class="i">🛡️</div><h1>${lang === 'ar' ? 'هذا الموقع محجوب' : 'This site is blocked'}</h1>
<p>${lang === 'ar' ? 'GB Browser يحجب المواقع الإباحية حتى يبقى التصفح نظيف وآمن.' : 'GB Browser blocks adult sites to keep browsing clean and safe.'}</p></div></body></html>`;
