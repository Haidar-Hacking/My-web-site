// سكربتات تُحقن داخل الصفحات: الحماية، معلومات الصفحة، الوضع الداكن، حجم الخط، وضع القراءة
import { AD_HOSTS } from './adhosts';

const COSMETIC = [
  '.adsbygoogle', 'ins.adsbygoogle', '[id^="div-gpt-ad"]', '[id^="google_ads_iframe"]', '[data-ad-slot]', '[data-ad-unit]',
  '.ad-slot', '.ad-banner', '.ad-container', '.ad-wrapper', '.adunit', '.ad-unit', '.advert', '.advertisement',
  '.banner-ad', '.sponsored-content', '.taboola', '#taboola-below-article', '.OUTBRAIN', '.ob-widget',
  'iframe[src*="googlesyndication"]', 'iframe[src*="doubleclick"]', 'amp-ad', 'amp-embed', 'amp-sticky-ad',
].join(',');

export function shieldScript({ enabled, popups, allow }) {
  return `(function () {
  if (window.__gbShield) return;
  window.__gbShield = true;
  var host = location.hostname.replace(/^www\\./, '');
  var allow = ${JSON.stringify(allow || [])};
  for (var a = 0; a < allow.length; a++) if (host === allow[a] || host.endsWith('.' + allow[a])) return;
  var post = function (o) { try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {} };
  var count = 0, timer = null;
  var report = function () {
    count++;
    if (timer) return;
    timer = setTimeout(function () { timer = null; var n = count; count = 0; post({ type: 'blocked', n: n }); }, 400);
  };
  ${enabled ? `
  var set = {};
  ${JSON.stringify(AD_HOSTS)}.forEach(function (d) { set[d] = 1; });
  var bad = function (u) {
    try {
      var h = new URL(u, location.href).hostname;
      while (h) { if (set[h]) return true; var i = h.indexOf('.'); if (i < 0) return false; h = h.slice(i + 1); }
    } catch (e) {}
    return false;
  };
  ['HTMLScriptElement', 'HTMLIFrameElement', 'HTMLImageElement'].forEach(function (name) {
    var C = window[name]; if (!C) return;
    var d = Object.getOwnPropertyDescriptor(C.prototype, 'src'); if (!d || !d.set) return;
    Object.defineProperty(C.prototype, 'src', {
      configurable: true, enumerable: d.enumerable,
      get: function () { return d.get.call(this); },
      set: function (v) { if (bad(v)) { report(); return; } d.set.call(this, v); }
    });
  });
  var sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    if (n === 'src' && /^(SCRIPT|IFRAME|IMG)$/.test(this.tagName) && bad(v)) { report(); return; }
    return sa.apply(this, arguments);
  };
  if (window.fetch) {
    var of = window.fetch;
    window.fetch = function (input) {
      var u = typeof input === 'string' ? input : (input && input.url);
      if (u && bad(u)) { report(); return Promise.reject(new TypeError('Blocked by GB Shield')); }
      return of.apply(this, arguments);
    };
  }
  var xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__gbBad = bad(u); return xo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () { if (this.__gbBad) { report(); return; } return xs.apply(this, arguments); };
  if (navigator.sendBeacon) {
    var sb = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (u, d) { if (bad(u)) { report(); return true; } return sb(u, d); };
  }
  var addStyle = function () {
    var root = document.head || document.documentElement;
    if (!root) { setTimeout(addStyle, 20); return; }
    var s = document.createElement('style');
    s.textContent = ${JSON.stringify(COSMETIC)} + '{display:none!important}';
    root.appendChild(s);
  };
  addStyle();
  var sweep = function (n) {
    if (n.nodeType !== 1) return;
    if (/^(SCRIPT|IFRAME|IMG)$/.test(n.tagName) && n.getAttribute('src') && bad(n.getAttribute('src'))) { n.remove(); report(); }
  };
  new MutationObserver(function (list) {
    list.forEach(function (m) { m.addedNodes.forEach(sweep); });
  }).observe(document.documentElement || document, { childList: true, subtree: true });
  ` : ''}
  ${popups ? `
  var lastTap = 0;
  ['click', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { lastTap = Date.now(); }, true); });
  var wo = window.open;
  window.open = function () {
    if (Date.now() - lastTap > 1000) { report(); return null; }
    return wo.apply(window, arguments);
  };
  ` : ''}
})(); true;`;
}

// Sent after each page load: title, icon and the page's own theme colour.
export const PAGE_INFO = `(function () {
  try {
    var icon = document.querySelector('link[rel~="apple-touch-icon"], link[rel~="icon"]');
    var theme = document.querySelector('meta[name="theme-color"]');
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'info', title: document.title,
      icon: icon ? icon.href : location.origin + '/favicon.ico',
      theme: theme ? theme.content : ''
    }));
  } catch (e) {}
})(); true;`;

export const darkScript = (on) => `(function () {
  var id = 'gb-dark', el = document.getElementById(id);
  if (!${on}) { if (el) el.remove(); return; }
  if (el) return;
  var bg = getComputedStyle(document.body || document.documentElement).backgroundColor;
  var m = bg.match(/rgba?\\(([^)]+)\\)/), lum = 1;
  if (m) { var p = m[1].split(',').map(Number); if (!(p.length === 4 && p[3] === 0)) lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255; }
  if (lum < 0.5) return;
  el = document.createElement('style'); el.id = id;
  el.textContent = 'html{filter:invert(.9) hue-rotate(180deg)!important;background:#fff!important}img,video,picture,canvas,iframe,svg image,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}';
  (document.head || document.documentElement).appendChild(el);
})(); true;`;

export const textSizeScript = (pct) => `(function () {
  document.documentElement.style.webkitTextSizeAdjust = '${pct}%';
  document.documentElement.style.textSizeAdjust = '${pct}%';
})(); true;`;

// A small article extractor for reading mode.
export const READER_SCRIPT = `(function () {
  try {
    var best = null, bestScore = 0;
    var score = function (el) {
      var text = (el.innerText || '').length, links = 0;
      el.querySelectorAll('a').forEach(function (a) { links += (a.innerText || '').length; });
      return text - links * 1.5 + el.querySelectorAll('p').length * 40;
    };
    document.querySelectorAll('article, main, [role=main], .post, .article, .entry-content, .post-content, #content').forEach(function (el) {
      var s = score(el); if (s > bestScore) { bestScore = s; best = el; }
    });
    var parents = new Map();
    document.querySelectorAll('p').forEach(function (p) {
      var par = p.parentElement; if (!par) return;
      parents.set(par, (parents.get(par) || 0) + (p.innerText || '').length);
    });
    parents.forEach(function (len, el) { if (len > bestScore) { bestScore = len; best = el; } });
    if (!best || bestScore < 280) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader', article: null })); return; }
    var clone = best.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,iframe,form,button,input,nav,aside,footer,svg,[aria-hidden=true]').forEach(function (n) { n.remove(); });
    clone.querySelectorAll('img').forEach(function (img) {
      var real = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (real) img.setAttribute('src', real);
      img.setAttribute('src', img.src); img.removeAttribute('srcset');
    });
    clone.querySelectorAll('a[href]').forEach(function (a) { a.setAttribute('href', a.href); });
    clone.querySelectorAll('*').forEach(function (n) {
      for (var i = n.attributes.length - 1; i >= 0; i--) { var at = n.attributes[i].name; if (/^on|^style$|^class$/i.test(at)) n.removeAttribute(at); }
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader', article: {
      title: document.title, site: location.hostname, html: clone.innerHTML,
      text: (clone.innerText || '').slice(0, 60000), dir: document.dir || ''
    } }));
  } catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader', article: null })); }
})(); true;`;

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const READER_THEMES = {
  light: { bg: '#FFFFFF', fg: '#1D2333', dim: '#5E6782', link: '#2F4FC4', line: '#E4E8F1' },
  sepia: { bg: '#F6EFE2', fg: '#3A2F22', dim: '#7C6A55', link: '#8A4B12', line: '#E6DAC4' },
  dark: { bg: '#141A2E', fg: '#DCE1EE', dim: '#99A3C2', link: '#8EA4FF', line: '#262F4D' },
};

export function readerHTML(article, { theme = 'light', size = 19, serif = false }) {
  const th = READER_THEMES[theme] || READER_THEMES.light;
  const arabic = /[؀-ۿ]/.test((article.text || '').slice(0, 400));
  const dir = article.dir || (arabic ? 'rtl' : 'ltr');
  const font = serif ? '"Geeza Pro","Noto Naskh Arabic",Georgia,serif' : '-apple-system,"SF Arabic","Noto Sans Arabic",Roboto,sans-serif';
  return `<!doctype html><html dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data:; style-src 'unsafe-inline'">
<style>
html{background:${th.bg};color:${th.fg};-webkit-text-size-adjust:100%}
body{margin:0;padding:24px 20px 80px;font:${size}px/1.85 ${font}}
h1{font-size:1.5em;line-height:1.35;margin:0 0 .4em}
.meta{color:${th.dim};font-size:.78em;margin:0 0 1.6em;padding-bottom:1em;border-bottom:1px solid ${th.line}}
p{margin:0 0 1.1em} a{color:${th.link}} img,video,figure{max-width:100%;height:auto;border-radius:8px}
blockquote{margin:1.2em 0;padding:.1em 1em;border-inline-start:3px solid ${th.link};color:${th.dim}}
pre{white-space:pre-wrap;background:${th.line};padding:10px;border-radius:8px;direction:ltr}
</style></head><body><h1>${esc(article.title)}</h1><p class="meta">${esc(article.site)}</p>${article.html}</body></html>`;
}

// Find in page: highlights matches and steps through them.
export const findScript = (query, step) => `(function () {
  var post = function (o) { try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {} };
  var F = window.__gbFind || (window.__gbFind = { q: '', marks: [], i: 0 });
  var clear = function () {
    F.marks.forEach(function (m) { var p = m.parentNode; if (!p) return; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
    F.marks = []; F.i = 0;
  };
  var paint = function () {
    F.marks.forEach(function (m, k) { m.style.background = k === F.i ? '#F2A33A' : '#FFE27A'; m.style.color = '#111'; });
    var cur = F.marks[F.i]; if (cur) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
    post({ type: 'find', n: F.marks.length, i: F.marks.length ? F.i + 1 : 0 });
  };
  var q = ${JSON.stringify(query)}, step = ${step | 0};
  if (q === null) { clear(); F.q = ''; return; }
  if (q !== F.q) {
    clear(); F.q = q;
    if (!q) { post({ type: 'find', n: 0, i: 0 }); return; }
    var lower = q.toLowerCase(), nodes = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentNode; if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
      return n.nodeValue.toLowerCase().indexOf(lower) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    while (walker.nextNode() && nodes.length < 400) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue, low = text.toLowerCase(), at = 0, idx, frag = document.createDocumentFragment();
      while ((idx = low.indexOf(lower, at)) >= 0 && F.marks.length < 999) {
        frag.appendChild(document.createTextNode(text.slice(at, idx)));
        var m = document.createElement('mark'); m.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(m); F.marks.push(m); at = idx + q.length;
      }
      frag.appendChild(document.createTextNode(text.slice(at)));
      node.parentNode.replaceChild(frag, node);
    });
  } else if (F.marks.length) {
    F.i = (F.i + step + F.marks.length) % F.marks.length;
  }
  paint();
})(); true;`;
