// GB Browser للموبايل — منطق العناوين والبحث والحاسبة والتواريخ (بدون اعتماد على مكتبات)

export const ENGINES = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=%s',
    suggest: (q) => `https://suggestqueries.google.com/complete/search?client=firefox&ie=utf-8&oe=utf-8&q=${encodeURIComponent(q)}`,
  },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s', suggest: (q) => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}` },
  duck: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', suggest: (q) => `https://duckduckgo.com/ac/?type=list&q=${encodeURIComponent(q)}` },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s', suggest: (q) => `https://search.brave.com/api/suggest?q=${encodeURIComponent(q)}` },
};

export const KEYWORDS = [
  { keys: ['yt', 'يوتيوب'], name: 'YouTube', url: 'https://m.youtube.com/results?search_query=%s' },
  { keys: ['w', 'wiki', 'ويكي'], name: 'Wikipedia', url: 'https://{lang}.m.wikipedia.org/w/index.php?search=%s' },
  { keys: ['m', 'map', 'خريطة', 'خرائط'], name: 'Google Maps', url: 'https://www.google.com/maps/search/%s' },
  { keys: ['img', 'صور'], name: 'Google Images', url: 'https://www.google.com/search?tbm=isch&q=%s' },
  { keys: ['tr', 'ترجم'], name: 'Google Translate', url: 'https://translate.google.com/?sl=auto&tl={lang}&text=%s&op=translate' },
  { keys: ['gh'], name: 'GitHub', url: 'https://github.com/search?q=%s' },
  { keys: ['x', 'tw'], name: 'X', url: 'https://x.com/search?q=%s' },
  { keys: ['gpt'], name: 'ChatGPT', url: 'https://chatgpt.com/?q=%s' },
  { keys: ['claude'], name: 'Claude', url: 'https://claude.ai/new?q=%s' },
];

export const isInternal = (url) => typeof url === 'string' && url.startsWith('gb://');

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export function searchURL(q, engine = 'google') {
  return (ENGINES[engine] || ENGINES.google).url.replace('%s', encodeURIComponent(q));
}

export function matchKeyword(raw, lang = 'ar') {
  const m = /^(\S+)\s+(.+)$/.exec(String(raw || '').trim());
  if (!m) return null;
  const kw = KEYWORDS.find((k) => k.keys.includes(m[1].toLowerCase()));
  if (!kw) return null;
  return { name: kw.name, query: m[2], url: kw.url.replace(/\{lang\}/g, lang).replace('%s', encodeURIComponent(m[2])) };
}

export function toURL(raw, engine = 'google', lang = 'ar') {
  const s = String(raw || '').trim();
  if (!s) return null;
  const kw = matchKeyword(s, lang);
  if (kw) return kw.url;
  if (/^gb:\/\//i.test(s)) return s.toLowerCase();
  if (/^(javascript|vbscript|file):/i.test(s)) return null;
  if (/^(https?|about|data):/i.test(s)) return s;
  if (!/\s/.test(s)) {
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#].*)?$/i.test(s)) return 'http://' + s;
    if (/^[^\s/?#:@]+\.[a-z؀-ۿ]{2,24}(:\d+)?([/?#].*)?$/i.test(s)) return 'https://' + s;
  }
  return searchURL(s, engine);
}

export function hostOf(url) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(String(url || ''));
  return m ? m[1].toLowerCase() : '';
}
export const siteOf = (url) => hostOf(url).replace(/^www\.|^m\./, '');

export function prettyURL(url) {
  if (!url || isInternal(url)) return '';
  let out = url;
  try { out = decodeURI(url); } catch { /* keep */ }
  return out.replace(/^https:\/\//, '').replace(/^www\./, '').replace(/^([^/?#]+)\/$/, '$1');
}

export function letterOf(title, url) {
  const ch = (siteOf(url) || title || '?').trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}

// Arithmetic typed in the address bar, without eval.
export function calc(raw) {
  const s = String(raw || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/٫/g, '.').replace(/[,\s]/g, '')
    .replace(/^=/, '');
  if (!s || s.length > 80 || !/^[\d.+\-*/()%^]+$/.test(s) || !/\d/.test(s)) return null;
  if (!/[+\-*/^%]/.test(s.replace(/^-/, ''))) return null;
  let i = 0;
  const peek = () => s[i];
  const num = () => {
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (!m) throw new Error('num');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  let expr;
  const atom = () => {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error(')'); i++; return v; }
    return num();
  };
  const postfix = () => { let v = atom(); while (peek() === '%') { i++; v /= 100; } return v; };
  const unary = () => {
    if (peek() === '-') { i++; return -unary(); }
    if (peek() === '+') { i++; return unary(); }
    return power();
  };
  const power = () => { const b = postfix(); if (peek() === '^') { i++; return b ** unary(); } return b; };
  const term = () => {
    let v = unary();
    while (peek() === '*' || peek() === '/') { const op = s[i++]; const r = unary(); v = op === '*' ? v * r : v / r; }
    return v;
  };
  expr = () => {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  try {
    const v = expr();
    if (i !== s.length || !Number.isFinite(v)) return null;
    return Math.round(v * 1e10) / 1e10;
  } catch { return null; }
}

// ---------------------------------------------------------------- numbers & dates (no Intl needed)
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const digits = (value, arabic) => (arabic ? String(value).replace(/\d/g, (d) => AR_DIGITS[d]) : String(value));

export function formatNumber(n, arabic) {
  const neg = n < 0;
  const [int, frac] = String(Math.abs(Math.round(n * 100) / 100)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, arabic ? '٬' : ',');
  return (neg ? '-' : '') + digits(grouped + (frac ? (arabic ? '٫' : '.') + frac : ''), arabic);
}

export const MONTHS = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export const WEEKDAYS = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
export const HIJRI_MONTHS = {
  ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
  en: ['Muharram', 'Safar', 'Rabiʻ I', 'Rabiʻ II', 'Jumada I', 'Jumada II', 'Rajab', 'Shaʻban', 'Ramadan', 'Shawwal', 'Dhuʻl-Qiʻdah', 'Dhuʻl-Hijjah'],
};

// Tabular Islamic calendar (can differ from moon sighting by a day).
export function hijri(date) {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const d = date.getDate();
  if (m < 3) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

// Umm al-Qura from the phone's own calendar when available, otherwise the tabular calendar.
export function hijriBest(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
    const get = (type) => Number((parts.find((p) => p.type === type) || {}).value);
    const r = { day: get('day'), month: get('month'), year: get('year') };
    if (r.year > 1400 && r.year < 1700 && r.month >= 1 && r.month <= 12 && r.day >= 1 && r.day <= 30) return r;
  } catch { /* no Intl calendar support */ }
  return hijri(date);
}

export function dateLine(date, lang, arabicDigits) {
  const ar = lang === 'ar';
  const W = WEEKDAYS[ar ? 'ar' : 'en'][date.getDay()];
  const M = MONTHS[ar ? 'ar' : 'en'][date.getMonth()];
  const num = (v) => digits(v, ar && arabicDigits);
  const greg = ar ? `${W}، ${num(date.getDate())} ${M} ${num(date.getFullYear())}` : `${W} ${date.getDate()} ${M} ${date.getFullYear()}`;
  const h = hijriBest(date);
  const HM = HIJRI_MONTHS[ar ? 'ar' : 'en'][h.month - 1];
  const hij = ar ? `${num(h.day)} ${HM} ${num(h.year)} هـ` : `${h.day} ${HM} ${h.year} AH`;
  return { greg, hijri: hij };
}

export function clock(date, lang, arabicDigits) {
  const ar = lang === 'ar';
  let hr = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  if (ar) {
    const period = hr < 12 ? 'ص' : 'م';
    hr = hr % 12 || 12;
    return { time: digits(`${hr}:${min}`, arabicDigits), period };
  }
  return { time: `${String(hr).padStart(2, '0')}:${min}`, period: '' };
}

export function greetingKey(date) {
  const h = date.getHours();
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

export const WISDOM = {
  ar: [
    'من جدّ وجد، ومن زرع حصد', 'الوقت كالسيف، إن لم تقطعه قطعك', 'العلم في الصغر كالنقش على الحجر',
    'خير الكلام ما قلّ ودلّ', 'الصبر مفتاح الفرج', 'إذا كان الكلام من فضة فالسكوت من ذهب',
    'اسأل مجرّب ولا تسأل حكيم', 'إيد وحدة ما تصفّق', 'مدّ رجليك على قدّ لحافك', 'اللي ما يعرف الصقر يشويه',
    'الجار قبل الدار', 'رُبّ أخٍ لك لم تلده أمك', 'القناعة كنز لا يفنى', 'من سار على الدرب وصل',
    'الصديق وقت الضيق', 'التكرار يعلّم الشطّار', 'اللي يريد العسل يصبر على قرص النحل', 'قطرة على قطرة تصير نهر',
    'لا تؤجّل عمل اليوم إلى الغد', 'كل تأخيرة بيها خيرة', 'على قدر أهل العزم تأتي العزائم', 'وخيرُ جليسٍ في الزمان كتابُ',
  ],
  en: [
    'Whoever strives succeeds; whoever plants harvests', 'Time is a sword: cut it, or it cuts you', 'Learning when young is carving in stone',
    'The best words are few and clear', 'Patience is the key to relief', 'If speech is silver, silence is gold',
    'Ask someone who has tried, not someone who is wise', 'One hand can’t clap', 'Stretch your legs only as far as your blanket',
    'Whoever doesn’t know the falcon will grill it', 'Choose the neighbour before the house', 'Many a brother was not born of your mother',
    'Contentment is a treasure that never runs out', 'Whoever walks the road arrives', 'A friend shows in hard times',
    'Repetition teaches the clever', 'Whoever wants honey must bear the bee’s sting', 'Drop by drop, a river forms',
    'Don’t put off today’s work until tomorrow', 'Every delay holds some good', 'Resolve comes in the measure of the resolute',
    'The best companion in time is a book',
  ],
};

export function wisdomFor(date, lang, shift = 0) {
  const list = WISDOM[lang] || WISDOM.ar;
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 864e5);
  return list[(day + shift) % list.length];
}

export function weatherKind(code, day) {
  if (code === 0) return [day ? 'sunny' : 'moonClear', 'clear'];
  if (code <= 2) return ['cloudSun', 'partly'];
  if (code === 3) return ['cloud', 'cloudy'];
  if (code === 45 || code === 48) return ['fog', 'fog'];
  if (code >= 51 && code <= 57) return ['rain', 'drizzle'];
  if (code >= 61 && code <= 67) return ['rain', 'rain'];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'snow'];
  if (code >= 80 && code <= 82) return ['rain', 'showers'];
  if (code >= 95) return ['storm', 'storm'];
  return ['cloud', 'cloudy'];
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
