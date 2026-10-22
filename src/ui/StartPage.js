// صفحة البداية على الموبايل
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Logo } from '../core/icons';
import { clock, dateLine, greetingKey, letterOf, siteOf, weatherKind, wisdomFor } from '../core/logic';
import { useData } from '../core/store';
import { Press, useUI } from './kit';

const TILE_COLORS = ['#3456D1', '#1C7F66', '#B5841C', '#A93556', '#6A45D0', '#127F92', '#C2553A', '#4B5B86'];
const colorFor = (text) => TILE_COLORS[[...String(text)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TILE_COLORS.length];

// Weather from Open-Meteo, kept for 15 minutes.
const weatherCache = { key: '', ts: 0, data: null };
async function fetchWeather(city, lang) {
  const key = `${city}|${lang}`;
  if (weatherCache.key === key && Date.now() - weatherCache.ts < 15 * 60 * 1000) return weatherCache.data;
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang}&format=json`)).json();
  const place = geo && geo.results && geo.results[0];
  if (!place) return { error: 'city' };
  const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`)).json();
  const data = {
    city: place.name, temp: Math.round(f.current.temperature_2m), code: f.current.weather_code, day: f.current.is_day === 1,
    max: Math.round(f.daily.temperature_2m_max[0]), min: Math.round(f.daily.temperature_2m_min[0]),
  };
  Object.assign(weatherCache, { key, ts: Date.now(), data });
  return data;
}

// One block of the page fades and rises into place, a little after the one before it.
function Rise({ i, children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 520, delay: i * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [i, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

function StarPattern({ height }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(y, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { top: -88, height: height + 88, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 88] }) }] }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="khatam" width="88" height="88" patternUnits="userSpaceOnUse">
            <Path d="M44 24L64 44L44 64L24 44Z M29.9 29.9H58.1V58.1H29.9Z M44 0V24M44 64V88M0 44H24M64 44H88" stroke="#F2D48A" strokeOpacity="0.13" strokeWidth="1" fill="none" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#khatam)" />
      </Svg>
    </Animated.View>
  );
}

export default function StartPage({ tab, onOpen, onSearch }) {
  const { c, t, lang, rtl, dir, arabicDigits, num } = useUI();
  const settings = useData('settings');
  const shortcuts = useData('shortcuts');
  const stats = useData('stats');
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(new Date());
  const [shift, setShift] = useState(0);
  const [wx, setWx] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!settings.weather || tab.private) return;
    let live = true;
    fetchWeather(settings.city || 'Baghdad', lang).then((d) => { if (live) setWx(d); }).catch(() => { if (live) setWx({ error: 'net' }); });
    return () => { live = false; };
  }, [settings.weather, settings.city, lang, tab.private]);

  const { time, period } = clock(now, lang, arabicDigits);
  const dates = dateLine(now, lang, arabicDigits);
  const cols = width > 600 ? 6 : 4;
  const tileW = Math.min(92, (Math.min(width, 560) - 32) / cols);
  const white = '#F4F6FC';

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={tab.private ? ['#3A2470', '#1A1036'] : [c.lapisTop, c.lapisBottom]} style={StyleSheet.absoluteFill} />
      <StarPattern height={height} />
      <ScrollView contentContainerStyle={[st.scroll, { paddingTop: insets.top + 10 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!tab.private && settings.weather && wx && !wx.error ? (
          <Rise i={0} style={[st.weatherRow, { flexDirection: dir }]}>
            <View style={[st.chip, { flexDirection: dir }]}>
              <Icon name={weatherKind(wx.code, wx.day)[0]} size={22} color={c.gold} />
              <Text style={st.wxTemp}>{num(wx.temp)}°</Text>
              <View>
                <Text style={[st.small, { color: white, fontWeight: '600', textAlign: rtl ? 'right' : 'left' }]}>{wx.city}</Text>
                <Text style={[st.small, { color: 'rgba(244,246,252,0.75)', textAlign: rtl ? 'right' : 'left' }]}>{t('wx.' + weatherKind(wx.code, wx.day)[1])}</Text>
              </View>
            </View>
          </Rise>
        ) : <View style={{ height: 44 }} />}

        {tab.private ? (
          <Rise i={1} style={st.hero}>
            <View style={st.privIc}><Icon name="mask" size={34} color={white} /></View>
            <Text style={[st.heroTitle, { color: white }]}>{t('private.title')}</Text>
            <Text style={[st.privText]}>{t('private.text')}</Text>
          </Rise>
        ) : (
          <Rise i={1} style={st.hero}>
            <Text style={st.greet}>{t('ntp.' + greetingKey(now))}</Text>
            <View style={[st.clockRow, { flexDirection: dir }]}>
              <Text style={st.clock} allowFontScaling={false}>{time}</Text>
              {period ? <Text style={st.ampm}>{period}</Text> : null}
            </View>
            <Text style={st.date}>{dates.greg}</Text>
            <Text style={[st.date, { color: '#E2B54C', marginTop: 2 }]}>{dates.hijri}</Text>
          </Rise>
        )}

        {!tab.private && settings.wisdom ? (
          <Rise i={2}>
            <Press onPress={() => setShift((x) => x + 1)} scaleTo={0.97} style={[st.wisdom, { flexDirection: dir }]}>
              <Icon name="quote" size={16} color="#E2B54C" />
              <Text style={st.wisdomText}>{wisdomFor(now, lang, shift)}</Text>
            </Press>
          </Rise>
        ) : null}

        <Rise i={3} style={st.searchWrap}>
          <Press onPress={onSearch} scaleTo={0.98} style={[st.search, { backgroundColor: c.dark ? 'rgba(255,255,255,0.14)' : c.surface, flexDirection: dir }]}>
            <Icon name="search" size={20} color={c.dark ? '#F4F6FC' : c.accent} />
            <Text style={[st.searchText, { color: c.dark ? 'rgba(244,246,252,0.72)' : c.faint, textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>{t('searchPlaceholder')}</Text>
            <Text style={[st.engine, { color: c.dark ? 'rgba(244,246,252,0.55)' : c.accent }]}>Go Browser</Text>
          </Press>
        </Rise>

        {!tab.private ? (
          <Rise i={4} style={[st.tiles, { flexDirection: dir, maxWidth: tileW * cols + 8 }]}>
            {shortcuts.map((sc) => (
              <Press key={sc.url} onPress={() => onOpen(sc.url)} style={[st.tile, { width: tileW }]} haptic="light">
                <View style={[st.face, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[st.letter, { color: colorFor(sc.title) }]}>{letterOf(sc.title, sc.url)}</Text>
                </View>
                <Text style={st.tileName} numberOfLines={1}>{sc.title || siteOf(sc.url)}</Text>
              </Press>
            ))}
          </Rise>
        ) : null}

        <Rise i={5} style={[st.footer, { flexDirection: dir }]}>
          <View style={[st.chip, { flexDirection: dir }]}>
            <Icon name="shield" size={16} color="#E2B54C" />
            <Text style={[st.small, { color: white }]}>{t('blockedCount', num(stats.blocked || 0))}</Text>
          </View>
          <Logo size={22} />
        </Rise>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  searchWrap: { alignSelf: 'stretch', alignItems: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 10, alignItems: 'center' },
  weatherRow: { alignSelf: 'stretch', marginBottom: 8 },
  chip: { alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  wxTemp: { color: '#F4F6FC', fontSize: 22, fontWeight: '300', fontVariant: ['tabular-nums'] },
  small: { fontSize: 12.5 },
  hero: { alignItems: 'center', marginTop: 18, marginBottom: 14 },
  greet: { color: 'rgba(244,246,252,0.85)', fontSize: 16, marginBottom: 2 },
  clockRow: { alignItems: 'baseline', gap: 8 },
  clock: { color: '#F4F6FC', fontSize: 76, fontWeight: '200', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ampm: { color: 'rgba(244,246,252,0.8)', fontSize: 20 },
  date: { color: 'rgba(244,246,252,0.9)', fontSize: 14.5, textAlign: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '700', marginTop: 12 },
  privIc: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  privText: { color: 'rgba(244,246,252,0.88)', fontSize: 14.5, lineHeight: 23, textAlign: 'center', marginTop: 10, maxWidth: 420 },
  wisdom: { alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, marginBottom: 18, maxWidth: 520 },
  wisdomText: { color: 'rgba(244,246,252,0.88)', fontSize: 14, flexShrink: 1, textAlign: 'center' },
  search: { width: '100%', maxWidth: 560, height: 52, borderRadius: 16, alignItems: 'center', gap: 12, paddingHorizontal: 16, shadowColor: '#050A1E', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  searchText: { flex: 1, fontSize: 15.5 },
  engine: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  tiles: { flexWrap: 'wrap', justifyContent: 'center', marginTop: 26, alignSelf: 'center' },
  tile: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  face: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#050A1E', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  letter: { fontSize: 21, fontWeight: '800' },
  tileName: { color: 'rgba(244,246,252,0.92)', fontSize: 12, maxWidth: 84 },
  footer: { alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 },
});
