// يجمع قوائم المواقع الإباحية المفتوحة المصدر ويكتبها في src/core/adultlist.js قبل بناء التطبيق.
// إذا فشل التنزيل، يبقى الملف مثل ما هو والبناء يكمل.
const fs = require('fs');
const path = require('path');
const SOURCES = [
  'https://raw.githubusercontent.com/StevenBlack/hosts/master/extensions/porn/sinfonietta/hosts',
  'https://raw.githubusercontent.com/StevenBlack/hosts/master/extensions/porn/clefspeare13/hosts',
  'https://raw.githubusercontent.com/StevenBlack/hosts/master/extensions/porn/tiuxo/hosts',
  'https://raw.githubusercontent.com/StevenBlack/hosts/master/extensions/porn/brijrajparmar27/hosts',
];
(async () => {
  const set = new Set();
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const body = await res.text();
      let n = 0;
      for (const line of body.split('\n')) {
        const m = line.match(/^\s*(?:0\.0\.0\.0|127\.0\.0\.1)\s+([a-z0-9.-]+\.[a-z0-9-]+)\s*(#.*)?$/i);
        if (!m) continue;
        const host = m[1].toLowerCase().replace(/^www\./, '');
        if (host === 'localhost' || host.endsWith('.local')) continue;
        set.add(host); n++;
      }
      console.log(`${url}: ${n}`);
    } catch (e) { console.log(`skip ${url}: ${e.message}`); }
  }
  if (set.size < 1000) { console.log('too few domains, keeping the existing list'); return; }
  const out = path.join(__dirname, '..', 'src', 'core', 'adultlist.js');
  fs.writeFileSync(out, '// Generated at build time from open-source blocklists. Do not edit.\nexport default ' + JSON.stringify([...set].sort().join('\n')) + ';\n');
  console.log(`wrote ${set.size} domains`);
})();
