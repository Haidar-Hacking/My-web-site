// ألوان GB: لازوردي وذهبي، بنفس هوية نسخة الكمبيوتر
export const ACCENTS = {
  lapis: { light: '#3456D1', dark: '#7D95FF' },
  palm: { light: '#1C7F66', dark: '#45C6A2' },
  gold: { light: '#9A6F14', dark: '#E2B54C' },
  maroon: { light: '#A93556', dark: '#EE7495' },
  violet: { light: '#6A45D0', dark: '#A68CFF' },
  teal: { light: '#127F92', dark: '#47C7DA' },
};

function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function palette({ dark, priv, accent }) {
  const pal = ACCENTS[priv ? 'violet' : accent] || ACCENTS.lapis;
  const acc = dark ? pal.dark : pal.light;
  const base = dark
    ? { frame: '#0F1528', bar: '#182039', field: '#0F1629', surface: '#1B2441', surface2: '#222C4D', line: '#2C3860', lineSoft: '#253052', text: '#E7EBF7', dim: '#A2ACCC', faint: '#6E7A9E', hover: 'rgba(231,235,247,0.08)', scrim: 'rgba(4,7,16,0.55)', danger: '#F07171' }
    : { frame: '#DCE2EF', bar: '#F7F9FD', field: '#E8ECF5', surface: '#FFFFFF', surface2: '#F2F5FB', line: '#CDD5E6', lineSoft: '#E2E7F1', text: '#18203A', dim: '#56617F', faint: '#8A93AE', hover: 'rgba(24,32,58,0.06)', scrim: 'rgba(16,22,42,0.34)', danger: '#C23A3A' };
  if (priv) {
    Object.assign(base, dark
      ? { frame: '#1D1533', bar: '#261D42', field: '#191230', surface: '#2A2148', surface2: '#31275A', line: '#3E3366', lineSoft: '#352B5A' }
      : { frame: '#E4DCF4', bar: '#F7F3FD', field: '#ECE5F8', surface2: '#F3EEFC', line: '#D6CCEC', lineSoft: '#E5DDF4' });
  }
  return {
    ...base,
    dark,
    accent: acc,
    accentSoft: alpha(acc, dark ? 0.18 : 0.12),
    accentInk: dark ? '#0D1430' : '#FFFFFF',
    gold: dark ? '#E2B54C' : '#B5841C',
    lapisTop: '#1B2C74',
    lapisBottom: '#0F1840',
  };
}
