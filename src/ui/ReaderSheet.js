// وضع القراءة: نص المقال فقط، بثلاث خلفيات وحجم خط، ويقرأ لك بصوت عالي
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core/icons';
import { READER_THEMES, readerHTML } from '../core/scripts';
import { setSetting, useData } from '../core/store';
import { Press, toast, useUI } from './kit';

const THEMES = ['light', 'sepia', 'dark'];

function chunks(text, max = 3000) {
  const parts = String(text || '').replace(/\s+/g, ' ').match(/[^.!?؟]+[.!?؟]*/g) || [];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + ' ' + p).length > max) { if (cur) out.push(cur); cur = p.slice(0, max); } else cur = cur ? cur + ' ' + p : p;
  }
  if (cur) out.push(cur);
  return out;
}

export default function ReaderSheet({ article, onClose, onLink }) {
  const { c, t, dir, num } = useUI();
  const insets = useSafeAreaInsets();
  const settings = useData('settings');
  const [speaking, setSpeaking] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const visible = !!article;

  useEffect(() => {
    if (visible) Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else { fade.setValue(0); Speech.stop(); setSpeaking(false); }
  }, [visible, fade]);
  useEffect(() => () => { Speech.stop(); }, []);

  if (!article) return null;
  const theme = READER_THEMES[settings.readerTheme] ? settings.readerTheme : 'light';
  const th = READER_THEMES[theme];
  const html = readerHTML(article, { theme, size: settings.readerSize, serif: settings.readerSerif });
  const arabic = /[؀-ۿ]/.test((article.text || '').slice(0, 400));
  const minutes = Math.max(1, Math.round((article.text || '').split(/\s+/).length / (arabic ? 160 : 220)));

  const listen = () => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    const list = chunks(article.title + '. ' + article.text);
    if (!list.length) return;
    setSpeaking(true);
    toast(t('listening'));
    list.forEach((part, i) => Speech.speak(part, {
      language: arabic ? 'ar' : 'en-US',
      rate: arabic ? 0.95 : 1,
      onDone: i === list.length - 1 ? () => setSpeaking(false) : undefined,
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    }));
  };
  const close = () => { Speech.stop(); onClose(); };
  const bar = { backgroundColor: th.bg, borderBottomColor: th.line };

  return (
    <Modal visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[st.wrap, { backgroundColor: th.bg, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        <View style={[st.bar, bar, { paddingTop: insets.top + 6, flexDirection: dir }]}>
          <Press onPress={close} style={st.btn} accessibilityLabel={t('close')}><Icon name="close" size={21} color={th.fg} /></Press>
          <Text style={[st.meta, { color: th.dim }]} numberOfLines={1}>{t('minRead', num(minutes))}</Text>
          <Press onPress={listen} style={[st.btn, speaking && { backgroundColor: th.line }]} accessibilityLabel={t('listen')}>
            <Icon name={speaking ? 'pause' : 'volume'} size={20} color={th.fg} />
          </Press>
          <Press onPress={() => setSetting('readerSize', Math.max(14, settings.readerSize - 1))} style={st.btn}><Text style={[st.aa, { color: th.fg, fontSize: 14 }]}>A</Text></Press>
          <Press onPress={() => setSetting('readerSize', Math.min(30, settings.readerSize + 1))} style={st.btn}><Text style={[st.aa, { color: th.fg, fontSize: 20 }]}>A</Text></Press>
          <Press onPress={() => setSetting('readerSerif', !settings.readerSerif)} style={[st.btn, settings.readerSerif && { backgroundColor: th.line }]} accessibilityLabel={t('font')}>
            <Text style={[st.aa, { color: th.fg, fontSize: 16 }]}>{arabic ? 'خط' : 'Ff'}</Text>
          </Press>
          <View style={[st.themes, { flexDirection: dir }]}>
            {THEMES.map((k) => (
              <Press key={k} onPress={() => setSetting('readerTheme', k)} haptic="select" style={[st.sw, { backgroundColor: READER_THEMES[k].bg, borderColor: theme === k ? c.accent : READER_THEMES[k].line }]} />
            ))}
          </View>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: '' }}
          style={{ flex: 1, backgroundColor: th.bg }}
          javaScriptEnabled={false}
          onShouldStartLoadWithRequest={(req) => {
            if (/^https?:/.test(req.url)) { close(); onLink(req.url); return false; }
            return true;
          }}
          setSupportMultipleWindows={false}
          contentInset={{ bottom: insets.bottom }}
        />
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1 },
  bar: { alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  btn: { minWidth: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, fontSize: 12.5, paddingHorizontal: 4 },
  aa: { fontWeight: '700' },
  themes: { gap: 6, paddingHorizontal: 4 },
  sw: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
});
