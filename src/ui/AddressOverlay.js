// شاشة الكتابة: بحث أو عنوان، مع اقتراحات وآلة حاسبة وكلمات بحث سريع
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Keyboard, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core/icons';
import { ENGINES, calc, isInternal, letterOf, matchKeyword, normalize, prettyURL, searchURL, toURL } from '../core/logic';
import { History, get } from '../core/store';
import { Press, Txt, tap, useUI } from './kit';

export default function AddressOverlay({ visible, tab, tabs, onClose, onGo, onSwitch }) {
  const { c, t, lang, dir, rtl, num } = useUI();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [remote, setRemote] = useState([]);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const input = useRef(null);
  const ver = useRef(0);

  useEffect(() => {
    if (visible) {
      setShown(true);
      setText(tab && !isInternal(tab.url) ? tab.url : '');
      setRemote([]);
      setCopied(false);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      setTimeout(() => input.current && input.current.focus(), 60);
    } else if (shown) {
      Keyboard.dismiss();
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShown(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const settings = get('settings');
  const q = text.trim();

  useEffect(() => {
    const v = ++ver.current;
    setRemote([]);
    setCopied(false);
    if (!q || !settings.suggestions || (tab && tab.private) || /^https?:\/\//.test(q) || q.length > 120) return undefined;
    const timer = setTimeout(async () => {
      try {
        const engine = ENGINES.duck;
        const ctrl = new AbortController();
        const kill = setTimeout(() => ctrl.abort(), 1500);
        const res = await fetch(engine.suggest(q), { signal: ctrl.signal });
        clearTimeout(kill);
        const data = await res.json();
        if (v === ver.current && Array.isArray(data) && Array.isArray(data[1])) setRemote(data[1].filter((x) => typeof x === 'string').slice(0, 5));
      } catch { /* offline or blocked */ }
    }, 140);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;

  const engineName = (ENGINES.duck).name;
  const items = [];
  if (q) {
    const kw = matchKeyword(q, lang);
    const url = toURL(q, settings.engine, lang);
    if (kw) items.push({ kind: 'keyword', label: kw.query, url: kw.url, tag: t('searchOn', kw.name) });
    else if (url && url !== searchURL(q)) items.push({ kind: 'url', label: prettyURL(url), url });
    else items.push({ kind: 'search', label: q, url, tag: t('searchWith', engineName) });
    const answer = calc(q);
    if (answer !== null) items.push({ kind: 'calc', label: '= ' + num(answer), value: answer });
    const nq = normalize(q);
    (tabs || []).filter((x) => x.id !== (tab && tab.id) && !isInternal(x.url) && (normalize(x.title).includes(nq) || x.url.includes(nq))).slice(0, 2)
      .forEach((x) => items.push({ kind: 'tab', label: x.title || prettyURL(x.url), url: x.url, id: x.id, tag: t('switchToTab') }));
    get('bookmarks').filter((b) => normalize(b.title).includes(nq) || b.url.includes(nq)).slice(0, 3)
      .forEach((b) => items.push({ kind: 'bookmark', label: b.title, url: b.url }));
    if (!(tab && tab.private)) History.query(q, 4).forEach((h) => items.push({ kind: 'history', label: h.title || prettyURL(h.url), url: h.url, sub: prettyURL(h.url) }));
    remote.forEach((r) => items.push({ kind: 'search', label: r, url: searchURL(r) }));
  } else if (!(tab && tab.private)) {
    History.query('', 8).forEach((h) => items.push({ kind: 'history', label: h.title || prettyURL(h.url), url: h.url, sub: prettyURL(h.url) }));
  }
  const seen = new Set();
  const list = items.filter((it) => { const k = it.kind + (it.url || it.label); if (seen.has(k)) return false; seen.add(k); return true; });

  const choose = (it) => {
    if (it.kind === 'calc') {
      Clipboard.setStringAsync(String(it.value)).then(() => { tap('select'); setCopied(true); }).catch(() => {});
      return;
    }
    if (it.kind === 'tab') { onSwitch(it.id); return; }
    onGo(it.url);
  };
  const submit = () => {
    if (!q) return;
    const url = toURL(q, settings.engine, lang);
    if (url) onGo(url);
  };
  const icon = { url: 'globe', search: 'search', keyword: 'search', calc: 'calc', tab: 'window', bookmark: 'star', history: 'history' };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface, opacity: fade }]}>
        <Animated.View style={{ flex: 1, paddingTop: insets.top + 8, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <View style={[st.top, { flexDirection: dir }]}>
            <View style={[st.field, { backgroundColor: c.field, flexDirection: dir, borderColor: c.accent }]}>
              <Icon name="search" size={18} color={c.accent} />
              <TextInput
                ref={input}
                value={text}
                onChangeText={setText}
                onSubmitEditing={submit}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={c.faint}
                style={[st.input, { color: c.text, textAlign: rtl && !/^[a-z0-9]/i.test(text) ? 'right' : 'left' }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="web-search"
                returnKeyType="go"
                selectTextOnFocus
                clearButtonMode="while-editing"
              />
            </View>
            <Press onPress={onClose} style={st.cancel}><Txt style={{ color: c.accent, fontWeight: '600' }}>{t('cancel')}</Txt></Press>
          </View>
          <FlatList
            data={list}
            keyExtractor={(it, i) => it.kind + i}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            ListHeaderComponent={!q ? <Txt style={[st.head, { color: c.faint }]}>{t('recent')}</Txt> : null}
            renderItem={({ item }) => (
              <Press onPress={() => choose(item)} scaleTo={0.985} style={[st.row, { flexDirection: dir }]}>
                <View style={[st.ic, { backgroundColor: item.kind === 'calc' ? c.accentSoft : c.surface2 }]}>
                  {item.kind === 'history' || item.kind === 'bookmark' ? (
                    <Text style={[st.letter, { color: c.accent }]}>{letterOf(item.label, item.url)}</Text>
                  ) : <Icon name={icon[item.kind]} size={18} color={item.kind === 'calc' ? c.accent : c.dim} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt numberOfLines={1} style={item.kind === 'calc' && { color: c.accent, fontWeight: '800', fontSize: 17 }}>{item.label}</Txt>
                  {item.sub ? <Txt numberOfLines={1} style={{ color: c.faint, fontSize: 12.5 }}>{item.sub}</Txt> : null}
                </View>
                {item.tag ? <Text style={[st.tag, { color: c.accent, backgroundColor: c.accentSoft }]}>{item.tag}</Text> : null}
                {item.kind === 'calc' ? <Text style={[st.tag, { color: c.accent, backgroundColor: c.accentSoft }]}>{t(copied ? 'copied' : 'copy')}</Text> : null}
              </Press>
            )}
            ListEmptyComponent={!q ? <Txt align="center" style={{ color: c.faint, marginTop: 30 }}>{t('typeToSearch')}</Txt> : null}
            contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  top: { alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  field: { flex: 1, height: 46, borderRadius: 14, borderWidth: 2, alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, fontSize: 16, height: 44 },
  cancel: { paddingHorizontal: 8, height: 44, justifyContent: 'center' },
  head: { fontSize: 12.5, fontWeight: '600', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
  row: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9, minHeight: 52 },
  ic: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 14, fontWeight: '800' },
  tag: { fontSize: 11.5, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
