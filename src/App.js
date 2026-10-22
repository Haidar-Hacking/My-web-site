// GB Browser للموبايل (آيفون وأندرويد) — الملف الرئيسي: التبويبات والصفحات وكل اللوحات
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState, BackHandler, I18nManager, KeyboardAvoidingView, Linking, Platform, Share, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AD_HOSTS } from './core/adhosts';
import { Icon } from './core/icons';
import { makeT } from './core/i18n';
import { digits, formatNumber, isInternal, parseURL, setSearchLook, siteOf, uid } from './core/logic';
import { PAGE_INFO, READER_SCRIPT, darkScript, findScript, shieldScript, textSizeScript } from './core/scripts';
import { Bookmarks, History, ReadLater, addBlocked, get, loadStore, set, setSetting, useData } from './core/store';
import { palette } from './core/theme';
import AddressOverlay from './ui/AddressOverlay';
import BottomBar from './ui/BottomBar';
import Library from './ui/Library';
import MenuSheet from './ui/MenuSheet';
import { FindBar, ShieldSheet } from './ui/PageTools';
import AuthScreen from './ui/AuthScreen';
import UpdateGate from './ui/UpdateGate';
import { isSignedIn } from './core/account';
import { forceSafeSearch, isAdult } from './core/safety';
import { checkForUpdate } from './core/updates';
import ReaderSheet from './ui/ReaderSheet';
import SettingsSheet from './ui/SettingsSheet';
import StartPage from './ui/StartPage';
import TabSwitcher from './ui/TabSwitcher';
import { Ctx, Press, ToastHost, Txt, tap, toast } from './ui/kit';

try { SplashScreen.preventAutoHideAsync(); } catch { /* already hidden */ }

const START = 'gb://start';
const KEEP_ALIVE = 5;
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const IOS_APP_NAME = 'Version/18.0 Mobile/15E148 Safari/604.1';

const AD_SET = new Set(AD_HOSTS);
function isAdURL(url) {
  let h = '';
  const p = parseURL(url);
  if (!p) return false;
  h = p.hostname;
  while (h) {
    if (AD_SET.has(h)) return true;
    const i = h.indexOf('.');
    if (i < 0) return false;
    h = h.slice(i + 1);
  }
  return false;
}

const makeTab = (url = START, priv = false, extra) => ({
  id: uid(), url, src: isInternal(url) ? null : url, title: '', private: priv,
  loading: !isInternal(url), progress: 0, canBack: false, canFwd: false, blocked: 0,
  desktop: false, gen: 0, theme: '', last: Date.now(), ...extra,
});

// A page's own theme colour, used behind the status bar; returns '' if it can't be read.
function parseColor(s) {
  const v = String(s || '').trim();
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
    const n = parseInt(h, 16);
    return { css: '#' + h, lum: (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 };
  }
  m = v.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (m) return { css: `rgb(${m[1]},${m[2]},${m[3]})`, lum: (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 };
  return null;
}

function ErrorPage({ desc, onRetry }) {
  const { c, t } = React.useContext(Ctx);
  return (
    <View style={[st.error, { backgroundColor: c.surface2 }]}>
      <View style={[st.errorIn, { backgroundColor: c.surface }]}>
      <View style={[st.errorIc, { backgroundColor: c.accentSoft }]}><Icon name="warn" size={30} color={c.accent} /></View>
      <Txt align="center" style={{ fontSize: 19, fontWeight: '700', marginTop: 14 }}>{t('errTitle')}</Txt>
      <Txt align="center" style={{ color: c.dim, marginTop: 6, lineHeight: 22 }}>{t('errText')}</Txt>
      {desc ? <Txt align="center" style={{ color: c.faint, fontSize: 12, marginTop: 8 }}>{desc}</Txt> : null}
      <Press onPress={onRetry} style={[st.retry, { backgroundColor: c.accent }]}>
        <Text style={{ color: c.accentInk, fontWeight: '700', fontSize: 15 }}>{t('retry')}</Text>
      </Press>
      </View>
    </View>
  );
}

// One web page. Memoised so a progress update in one tab doesn't redraw the others.
const TabWeb = memo(function TabWeb({ tab, visible, settings, allow, bind, on }) {
  const ref = useRef(null);
  const onRef = useRef(on);
  onRef.current = on;
  useEffect(() => {
    bind(tab.id, ref.current);
    return () => { bind(tab.id, null); onRef.current.evicted(tab.id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const source = useMemo(() => ({ uri: tab.src }), [tab.src]);
  const before = useMemo(
    () => shieldScript({ enabled: settings.shield, popups: settings.popups && settings.shield, allow }),
    [settings.shield, settings.popups, allow],
  );
  const after = useMemo(
    () => PAGE_INFO + darkScript(!!settings.darkSites) + (Platform.OS === 'ios' && settings.textSize !== 100 ? textSizeScript(settings.textSize) : ''),
    [settings.darkSites, settings.textSize],
  );
  const id = tab.id;

  return (
    <View style={[StyleSheet.absoluteFill, !visible && st.hidden]} pointerEvents={visible ? 'auto' : 'none'}>
      <WebView
        ref={ref}
        source={source}
        style={st.web}
        incognito={tab.private && Platform.OS === 'ios'}
        cacheEnabled={!tab.private}
        cacheMode={tab.private ? 'LOAD_NO_CACHE' : 'LOAD_DEFAULT'}
        userAgent={tab.desktop ? DESKTOP_UA : Platform.OS === 'android' ? ANDROID_UA : undefined}
        applicationNameForUserAgent={Platform.OS === 'ios' && !tab.desktop ? IOS_APP_NAME : undefined}
        injectedJavaScriptBeforeContentLoaded={before}
        injectedJavaScript={after}
        textZoom={settings.textSize}
        onLoadStart={(e) => on.loadStart(id, e.nativeEvent)}
        onLoadProgress={(e) => on.progress(id, e.nativeEvent.progress)}
        onLoadEnd={(e) => on.loadEnd(id, e.nativeEvent)}
        onNavigationStateChange={(n) => on.nav(id, n)}
        onMessage={(e) => on.message(id, e.nativeEvent.data)}
        onShouldStartLoadWithRequest={(r) => on.should(id, r)}
        onOpenWindow={(e) => on.openWindow(id, e.nativeEvent.targetUrl)}
        onFileDownload={(e) => on.download(e.nativeEvent.downloadUrl)}
        onContentProcessDidTerminate={() => ref.current && ref.current.reload()}
        onRenderProcessGone={() => ref.current && ref.current.reload()}
        renderError={(_d, _code, desc) => <ErrorPage desc={desc} onRetry={() => ref.current && ref.current.reload()} />}
        setSupportMultipleWindows
        javaScriptCanOpenWindowsAutomatically={!settings.popups}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        allowsLinkPreview
        pullToRefreshEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        decelerationRate="normal"
        originWhitelist={['http://*', 'https://*', 'about:*', 'data:*', 'blob:*']}
        webviewDebuggingEnabled={__DEV__}
      />
    </View>
  );
});

function Browser() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const settings = useData('settings');
  const allow = useData('siteAllow');
  const [tabs, setTabs] = useState(() => {
    const saved = get('session');
    const list = (saved.tabs || []).filter((x) => x && x.url).map((x) => makeTab(x.url, false, { id: x.id || uid(), title: x.title || '', loading: false, asleep: true, last: 0 }));
    return list.length ? list : [makeTab()];
  });
  const [activeId, setActiveId] = useState(() => {
    const saved = get('session');
    return (saved.tabs && saved.tabs[saved.active] && saved.tabs[saved.active].id) || null;
  });
  const [sheet, setSheet] = useState(null);
  const [section, setSection] = useState('bookmarks');
  const [privMode, setPrivMode] = useState(false);
  const [article, setArticle] = useState(null);
  const [find, setFind] = useState(false);
  const [found, setFound] = useState({ n: 0, i: 0 });
  const refs = useRef({});
  const findQ = useRef('');
  const closed = useRef([]);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const active = tabs.find((x) => x.id === activeId) || tabs[tabs.length - 1];
  const activeRef = useRef(active);
  activeRef.current = active;

  // ---- Look and language ----
  const lang = settings.lang === 'en' ? 'en' : 'ar';
  const rtl = lang === 'ar';
  const nativeRTL = I18nManager.isRTL;
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && scheme === 'dark');
  setSearchLook({ dark, lang });
  const ui = useMemo(() => {
    const arabicDigits = rtl && settings.digits === 'arab';
    return {
      c: palette({ dark, priv: !!active.private, accent: settings.accent }),
      t: makeT(lang),
      lang, rtl, arabicDigits,
      dir: rtl !== nativeRTL ? 'row-reverse' : 'row',
      num: (v) => (typeof v === 'number' ? formatNumber(v, arabicDigits) : digits(v, arabicDigits)),
    };
  }, [dark, active.private, settings.accent, settings.digits, lang, rtl, nativeRTL]);
  const { c, t } = ui;
  const tRef = useRef(t);
  tRef.current = t;

  // ---- Sign-in and updates ----
  useData('auth');
  useData('account');
  const signedIn = isSignedIn();
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    if (!signedIn) return undefined;
    const check = () => checkForUpdate().then((u) => { if (u) setUpdate(u); }).catch(() => {});
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [signedIn]);

  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);

  // ---- Tab state helpers ----
  const patch = useCallback((id, p) => {
    setTabs((list) => {
      let changed = false;
      const next = list.map((x) => {
        if (x.id !== id) return x;
        for (const k in p) if (x[k] !== p[k]) { changed = true; break; }
        return changed ? { ...x, ...p } : x;
      });
      return changed ? next : list;
    });
  }, []);

  // Save the normal (non-private) tabs so they come back next time.
  useEffect(() => {
    const timer = setTimeout(() => {
      const normal = tabs.filter((x) => !x.private);
      const idx = Math.max(0, normal.findIndex((x) => x.id === active.id));
      set('session', { tabs: normal.slice(-40).map((x) => ({ id: x.id, url: x.url, title: x.title })), active: idx });
    }, 600);
    return () => clearTimeout(timer);
  }, [tabs, active.id]);

  const activate = useCallback((id) => {
    setActiveId(id);
    patch(id, { last: Date.now(), asleep: false });
    setFind(false);
  }, [patch]);

  const addTab = useCallback((url = START, priv = false, extra) => {
    const tab = makeTab(url, priv, extra);
    setTabs((list) => [...list, tab]);
    setActiveId(tab.id);
    setFind(false);
    return tab;
  }, []);

  const go = useCallback((url, id) => {
    const tab = tabsRef.current.find((x) => x.id === (id || activeRef.current.id));
    if (!tab) return;
    setSheet(null);
    if (isInternal(url)) { patch(tab.id, { url: START, src: null, title: '', loading: false, canBack: false, canFwd: false, blocked: 0, adult: '' }); return; }
    if (isAdult(url)) { tap('medium'); patch(tab.id, { adult: siteOf(url) }); return; }
    url = forceSafeSearch(url) || url;
    if (tab.adult) patch(tab.id, { adult: '' });
    const web = refs.current[tab.id];
    if (web && tab.src === url && !isInternal(tab.url)) {
      web.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
    } else {
      patch(tab.id, { url, src: url, loading: true, progress: 0.05, blocked: 0, title: '' });
    }
  }, [patch]);

  const closeTab = useCallback((id) => {
    const list = tabsRef.current;
    const tab = list.find((x) => x.id === id);
    if (!tab) return;
    let rest = list.filter((x) => x.id !== id);
    if (!rest.some((x) => !x.private)) rest = [...rest, makeTab()];
    if (id === activeRef.current.id) {
      const pool = rest.filter((x) => !!x.private === !!tab.private);
      const next = (pool.length ? pool : rest.filter((x) => !x.private)).sort((p, q) => q.last - p.last)[0];
      rest = rest.map((x) => (x.id === next.id ? { ...x, asleep: false, last: Date.now() } : x));
      setActiveId(next.id);
    }
    setTabs(rest);
    if (!tab.private && !isInternal(tab.url)) {
      closed.current = [{ url: tab.url, title: tab.title }, ...closed.current].slice(0, 20);
      toast(tRef.current('tabClosed'), {
        label: tRef.current('undo'),
        run: () => { const r = closed.current.shift(); if (r) addTab(r.url, false, { title: r.title }); },
      });
    }
  }, [addTab]);

  const closeAll = useCallback((priv) => {
    const rest = tabsRef.current.filter((x) => !!x.private !== priv);
    if (!rest.some((x) => !x.private)) rest.push(makeTab());
    setTabs(rest);
    setActiveId(rest.filter((x) => !x.private).sort((a, b) => b.last - a.last)[0].id);
    setPrivMode(false);
    tap('medium');
    toast(tRef.current(priv ? 'privateClosed' : 'allClosed'));
  }, []);

  const switchBy = useCallback((step) => {
    const cur = activeRef.current;
    const list = tabsRef.current.filter((x) => !!x.private === !!cur.private);
    const i = list.findIndex((x) => x.id === cur.id);
    const next = list[i + (ui.rtl ? -step : step)];
    if (next) { tap('select'); activate(next.id); }
  }, [activate, ui.rtl]);

  // ---- WebView events (stable object so TabWeb stays memoised) ----
  const bind = useCallback((id, ref) => { if (ref) refs.current[id] = ref; else delete refs.current[id]; }, []);
  const on = useMemo(() => ({
    evicted: (id) => setTabs((list) => (list.some((x) => x.id === id && x.src !== x.url && !isInternal(x.url))
      ? list.map((x) => (x.id === id ? { ...x, src: x.url } : x))
      : list)),
    loadStart: (id, n) => {
      const p = { loading: true, progress: 0.08, blocked: 0, theme: '', adult: '' };
      if (n && /^https?:/.test(n.url || '')) p.url = n.url;
      patch(id, p);
    },
    progress: (id, p) => {
      const tab = tabsRef.current.find((x) => x.id === id);
      if (tab && (p >= 1 || p - (tab.progress || 0) > 0.08)) patch(id, { progress: p });
    },
    loadEnd: (id, n) => {
      const tab = tabsRef.current.find((x) => x.id === id);
      patch(id, { loading: false, progress: 1 });
      if (tab && !tab.private && n && /^https?:/.test(n.url || '')) History.add({ url: n.url, title: n.title || tab.title });
    },
    nav: (id, n) => {
      const tab = tabsRef.current.find((x) => x.id === id);
      if (!tab) return;
      const p = { canBack: !!n.canGoBack, canFwd: !!n.canGoForward };
      if (n.url && /^(https?|about|data|blob):/.test(n.url) && n.url !== 'about:blank') p.url = n.url;
      if (n.title && !/^https?:\/\//.test(n.title)) p.title = n.title;
      if (typeof n.loading === 'boolean') p.loading = n.loading;
      patch(id, p);
    },
    message: (id, raw) => {
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (m.type === 'blocked' && m.n > 0) {
        const tab = tabsRef.current.find((x) => x.id === id);
        if (tab) patch(id, { blocked: (tab.blocked || 0) + m.n });
        addBlocked(m.n);
      } else if (m.type === 'info') {
        const p = {};
        if (m.title) p.title = String(m.title).slice(0, 200);
        if (typeof m.theme === 'string') p.theme = m.theme.slice(0, 40);
        patch(id, p);
      } else if (m.type === 'reader' && id === activeRef.current.id) {
        if (m.article && m.article.html) setArticle(m.article);
        else toast(tRef.current('noArticle'));
      } else if (m.type === 'find') {
        setFound({ n: m.n | 0, i: m.i | 0 });
      }
    },
    should: (id, req) => {
      const url = req.url || '';
      if (/^(https?|about|data|blob|file):/i.test(url)) {
        const top = req.isTopFrame !== false;
        if (isAdult(url)) { if (top) patch(id, { adult: siteOf(url), loading: false }); return false; }
        const safe = top && forceSafeSearch(url);
        if (safe) { go(safe, id); return false; }
        const s = get('settings');
        if (s.shield && isAdURL(url)) {
          const tab = tabsRef.current.find((x) => x.id === id);
          const host = tab ? siteOf(tab.url) : '';
          if (!get('siteAllow').includes(host)) {
            if (tab) patch(id, { blocked: (tab.blocked || 0) + 1 });
            addBlocked(1);
            return false;
          }
        }
        return true;
      }
      let target = url;
      if (/^intent:/i.test(url)) {
        const fb = url.match(/S\.browser_fallback_url=([^;]+)/);
        if (fb) { go(decodeURIComponent(fb[1]), id); return false; }
      }
      Linking.openURL(target).catch(() => toast(tRef.current('cantOpen')));
      return false;
    },
    openWindow: (id, url) => {
      if (!url || !/^https?:/.test(url)) return;
      const parent = tabsRef.current.find((x) => x.id === id);
      addTab(url, !!(parent && parent.private), { parent: id });
    },
    download: (url) => {
      if (!url) return;
      Share.share(Platform.OS === 'ios' ? { url } : { message: url }).catch(() => {});
    },
  }), [patch, addTab, go]);

  // ---- Page actions ----
  const web = () => refs.current[active.id];
  const inject = (js) => { const w = web(); if (w) w.injectJavaScript(js); };
  const back = useCallback(() => {
    const tab = activeRef.current;
    const w = refs.current[tab.id];
    if (tab.canBack && w) { w.goBack(); return true; }
    if (!isInternal(tab.url)) {
      if (tab.parent && tabsRef.current.some((x) => x.id === tab.parent)) { const p = tab.parent; closeTab(tab.id); activate(p); return true; }
      go(START, tab.id);
      return true;
    }
    return false;
  }, [go, closeTab, activate]);

  const act = {
    bookmark: () => {
      const added = Bookmarks.toggle(active.url, active.title);
      tap('select');
      toast(t(added ? 'bookmarkAdded' : 'bookmarkRemoved'));
    },
    readLater: () => {
      const has = get('readLater').find((x) => x.url === active.url);
      if (has) { ReadLater.remove(has.id); toast(t('readLaterRemoved')); } else { ReadLater.add(active.url, active.title); toast(t('readLaterAdded')); }
      tap('select');
    },
    share: () => Share.share(Platform.OS === 'ios' ? { url: active.url, title: active.title } : { message: active.url, title: active.title }).catch(() => {}),
    copy: () => Clipboard.setStringAsync(active.url).then(() => toast(t('linkCopied'))).catch(() => {}),
    find: () => { findQ.current = ''; setFound({ n: 0, i: 0 }); setFind(true); },
    reader: () => inject(READER_SCRIPT),
    desktop: () => {
      const on = !active.desktop;
      patch(active.id, { desktop: on, gen: active.gen + 1, src: active.url, loading: true });
      toast(t(on ? 'desktopOn' : 'desktopOff'));
    },
    pin: () => {
      const list = get('shortcuts');
      if (list.some((x) => x.url === active.url)) { set('shortcuts', list.filter((x) => x.url !== active.url)); toast(t('unpinned')); return; }
      if (list.length >= 12) { toast(t('pinFull')); return; }
      set('shortcuts', [...list, { title: (active.title || siteOf(active.url)).slice(0, 24), url: active.url }]);
      toast(t('pinned'));
    },
    darkSites: (v) => {
      setSetting('darkSites', v);
      Object.values(refs.current).forEach((w) => w && w.injectJavaScript(darkScript(v)));
    },
    textSize: (d) => {
      const v = Math.max(70, Math.min(200, settings.textSize + d));
      setSetting('textSize', v);
      if (Platform.OS === 'ios') Object.values(refs.current).forEach((w) => w && w.injectJavaScript(textSizeScript(v)));
    },
    library: (key) => { setSection(key); setSheet('library'); },
    privateTab: () => addTab(START, true),
    settings: () => setSheet('settings'),
  };

  const siteToggle = (host, enable) => {
    const list = get('siteAllow');
    set('siteAllow', enable ? list.filter((h) => h !== host) : [...new Set([...list, host])]);
    toast(t(enable ? 'shieldOnFor' : 'shieldOffFor', host));
    setTimeout(() => { const w = web(); if (w) w.reload(); }, 250);
  };

  // ---- Links opened from other apps ----
  useEffect(() => {
    const open = (url) => { if (url && /^https?:\/\//i.test(url)) addTab(url); };
    Linking.getInitialURL().then(open).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, [addTab]);

  // ---- Android back button ----
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (article) { setArticle(null); return true; }
      if (sheet) { setSheet(null); return true; }
      if (find) { inject(findScript(null, 0)); setFind(false); return true; }
      return back();
    });
    return () => sub.remove();
  });

  // ---- Which pages stay loaded in memory ----
  const alive = useMemo(() => {
    const pages = tabs.filter((x) => !isInternal(x.url) && x.src && (!x.asleep || x.id === active.id));
    const keep = new Set(pages.slice().sort((a, b) => b.last - a.last).slice(0, KEEP_ALIVE).map((x) => x.id));
    keep.add(active.id);
    return pages.filter((x) => keep.has(x.id));
  }, [tabs, active.id]);

  const internal = isInternal(active.url);
  const theme = !internal && parseColor(active.theme);
  const topColor = theme ? theme.css : c.bar;
  const topLight = theme ? theme.lum < 0.55 : c.dark;
  const normalCount = tabs.filter((x) => !x.private).length;
  const shownTab = { ...active, canBack: active.canBack || !internal };
  const statusStyle = (sheet === 'tabs' || sheet === 'address' || sheet === 'library' || sheet === 'settings')
    ? (c.dark ? 'light' : 'dark')
    : internal ? 'light' : (topLight ? 'light' : 'dark');

  if (!signedIn) {
    return (
      <Ctx.Provider value={ui}>
        <StatusBar style="light" />
        <AuthScreen onDone={() => {}} />
        <ToastHost bottom={insets.bottom + 40} />
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={ui}>
      <View style={[st.root, { backgroundColor: internal ? c.lapisBottom : topColor }]}>
        <StatusBar style={statusStyle} animated />
        <KeyboardAvoidingView style={st.root} enabled={find} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.root}>
            {!internal ? <View style={{ height: insets.top, backgroundColor: topColor }} /> : null}
            <View style={[st.content, { backgroundColor: c.surface }]}>
              {alive.map((tab) => (
                <TabWeb
                  key={tab.id + ':' + tab.gen}
                  tab={tab}
                  visible={tab.id === active.id && !internal}
                  settings={settings}
                  allow={allow}
                  bind={bind}
                  on={on}
                />
              ))}
              {internal ? (
                <StartPage key={active.id} tab={active} onOpen={(u) => go(u)} onSearch={() => setSheet('address')} />
              ) : null}
              {active.adult ? (
                <View style={[StyleSheet.absoluteFill, st.blocked, { backgroundColor: c.lapisBottom }]}>
                  <View style={st.blockedIc}><Icon name="shield" size={40} color="#E2B54C" /></View>
                  <Text style={st.blockedH}>{t('adult.title')}</Text>
                  <Text style={st.blockedP}>{t('adult.text')}</Text>
                  <Text style={st.blockedSite}>{active.adult}</Text>
                  <Press onPress={() => patch(active.id, { adult: '' })} style={st.blockedBtn}>
                    <Text style={{ color: '#1A2448', fontWeight: '800', fontSize: 15 }}>{t('adult.back')}</Text>
                  </Press>
                </View>
              ) : null}
            </View>
            {find ? (
              <FindBar
                visible
                result={found}
                onQuery={(q) => { findQ.current = q; inject(findScript(q, 0)); }}
                onStep={(d) => inject(findScript(findQ.current, d))}
                onClose={() => { inject(findScript(null, 0)); setFind(false); }}
              />
            ) : (
              <BottomBar
                tab={shownTab}
                tabCount={active.private ? tabs.length - normalCount : normalCount}
                shieldOn={settings.shield && !allow.includes(siteOf(active.url))}
                onAddress={() => setSheet('address')}
                onShield={() => setSheet('shield')}
                onBack={back}
                onForward={() => { const w = web(); if (w) w.goForward(); }}
                onShare={act.share}
                onTabs={() => { setPrivMode(!!active.private); setSheet('tabs'); }}
                onNewTab={() => { tap('medium'); addTab(START, !!active.private); }}
                onMenu={() => setSheet('menu')}
                onReload={() => { const w = web(); if (!w) return; if (active.loading) { w.stopLoading(); patch(active.id, { loading: false }); } else w.reload(); }}
                onSwipe={switchBy}
              />
            )}
          </View>
        </KeyboardAvoidingView>
        <ToastHost bottom={insets.bottom + 120} />

        <AddressOverlay
          visible={sheet === 'address'}
          tab={active}
          tabs={tabs}
          onClose={() => setSheet(null)}
          onGo={(u) => go(u)}
          onSwitch={(id) => { setSheet(null); activate(id); }}
        />
        <TabSwitcher
          visible={sheet === 'tabs'}
          tabs={tabs}
          activeId={active.id}
          privateMode={privMode}
          onMode={setPrivMode}
          onClose={() => setSheet(null)}
          onOpen={(id) => { activate(id); setSheet(null); }}
          onCloseTab={closeTab}
          onNew={(p) => { addTab(START, p); setSheet(null); }}
          onCloseAll={() => closeAll(privMode)}
        />
        <MenuSheet visible={sheet === 'menu'} tab={active} onClose={() => setSheet(null)} act={act} />
        <ShieldSheet visible={sheet === 'shield'} tab={active} onClose={() => setSheet(null)} onSiteToggle={siteToggle} />
        <Library visible={sheet === 'library'} section={section} onClose={() => setSheet(null)} onOpen={(u) => go(u)} />
        <SettingsSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} />
        <UpdateGate update={update} />
        <ReaderSheet article={article} onClose={() => setArticle(null)} onLink={(u) => go(u)} />
      </View>
    </Ctx.Provider>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { I18nManager.allowRTL(false); I18nManager.swapLeftAndRightInRTL(false); } catch { /* web */ }
    loadStore().finally(() => setReady(true));
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0F1840' }} />;
  return (
    <SafeAreaProvider>
      <Browser />
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  blocked: { alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 5 },
  blockedIc: { width: 80, height: 80, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  blockedH: { color: '#F4F6FC', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  blockedP: { color: 'rgba(244,246,252,0.82)', fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 8, maxWidth: 330 },
  blockedSite: { color: 'rgba(244,246,252,0.5)', fontSize: 13, marginTop: 10 },
  blockedBtn: { marginTop: 22, height: 48, paddingHorizontal: 30, borderRadius: 14, backgroundColor: '#E2B54C', alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  hidden: { opacity: 0, zIndex: -1 },
  error: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorIn: { alignItems: 'center', padding: 24, borderRadius: 20, width: '100%', maxWidth: 380 },
  errorIc: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: 18, height: 46, paddingHorizontal: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
