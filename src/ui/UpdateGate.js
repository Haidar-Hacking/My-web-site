// نافذة التحديث: "يرجى تحديث المتصفح"، توافق على الشروط، تنزيل بشاشة تحميل، ثم التثبيت
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Logo } from '../core/icons';
import { canSelfInstall, currentVersion, downloadAndInstall } from '../core/updates';
import { set } from '../core/store';
import { Press, tap, useUI } from './kit';

export default function UpdateGate({ update }) {
  const { c, t, rtl, dir, num } = useUI();
  const insets = useSafeAreaInsets();
  const [agree, setAgree] = useState(false);
  const [phase, setPhase] = useState('ask');
  const [progress, setProgress] = useState(0);
  const bar = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'download') return undefined;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [phase, spin]);
  useEffect(() => {
    Animated.timing(bar, { toValue: Math.max(0.03, progress), duration: 250, useNativeDriver: false }).start();
  }, [progress, bar]);

  if (!update) return null;
  const align = { textAlign: rtl ? 'right' : 'left' };

  const start = async () => {
    if (!agree) return;
    tap('medium');
    set('updates', { accepted: update.version });
    if (!canSelfInstall || !update.apk) { Linking.openURL(update.page).catch(() => {}); return; }
    setPhase('download');
    setProgress(0);
    try {
      await downloadAndInstall(update.apk, (p) => setProgress(p < 0 ? 0.5 : p));
      setPhase('install');
    } catch {
      setPhase('error');
    }
  };

  const pct = Math.round(progress * 100);
  return (
    <Modal visible animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <LinearGradient colors={[c.lapisTop, c.lapisBottom]} style={StyleSheet.absoluteFill} />
      <View style={[st.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]}>
        {phase === 'ask' ? (
          <>
            <View style={st.head}>
              <View style={st.badge}><Icon name="update" size={30} color="#E2B54C" /></View>
              <Text style={st.h1}>{t('upd.title')}</Text>
              <Text style={st.sub}>{t('upd.version', num(currentVersion()), num(update.version))}</Text>
            </View>
            <View style={[st.card, { backgroundColor: c.surface }]}>
              <ScrollView style={{ flexGrow: 0, maxHeight: 330 }} contentContainerStyle={{ gap: 10 }}>
                {update.notes ? (
                  <>
                    <Text style={[st.sec, { color: c.accent }, align]}>{t('upd.whatsNew')}</Text>
                    <Text style={[st.body, { color: c.text }, align]}>{update.notes.replace(/\r/g, '').trim()}</Text>
                  </>
                ) : null}
                <Text style={[st.sec, { color: c.accent }, align]}>{t('upd.terms')}</Text>
                <Text style={[st.body, { color: c.dim }, align]}>{t('upd.termsText')}</Text>
              </ScrollView>
              <Press onPress={() => { tap('select'); setAgree((x) => !x); }} scaleTo={0.98} style={[st.agree, { flexDirection: dir, borderColor: c.lineSoft }]}>
                <View style={[st.box, { borderColor: agree ? c.accent : c.line, backgroundColor: agree ? c.accent : 'transparent' }]}>
                  {agree ? <Icon name="check" size={15} color={c.accentInk} strokeWidth={3} /> : null}
                </View>
                <Text style={[st.agreeText, { color: c.text }, align]}>{t('upd.agree')}</Text>
              </Press>
              <Press onPress={start} disabled={!agree} scaleTo={0.97} style={[st.btn, { backgroundColor: c.accent }]}>
                <Text style={[st.btnText, { color: c.accentInk }]}>{t(canSelfInstall ? 'upd.now' : 'upd.openPage')}</Text>
              </Press>
              {!canSelfInstall ? <Text style={[st.hint, { color: c.faint }]}>{t('upd.iosHint')}</Text> : null}
            </View>
          </>
        ) : (
          <View style={st.center}>
            <View>
              <Animated.View style={[st.ring, phase === 'download' && { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
              <View style={st.logoIn}><Logo size={64} /></View>
            </View>
            <Text style={st.h1}>{t(phase === 'download' ? 'upd.downloading' : phase === 'install' ? 'upd.installTitle' : 'upd.failed')}</Text>
            {phase === 'download' ? (
              <>
                <View style={st.track}><Animated.View style={[st.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>
                <Text style={st.pct}>{num(pct)}{rtl ? '٪' : '%'}</Text>
              </>
            ) : null}
            <Text style={[st.sub, { maxWidth: 320 }]}>{t(phase === 'download' ? 'upd.wait' : phase === 'install' ? 'upd.installText' : 'upd.failedText')}</Text>
            {phase !== 'download' ? (
              <View style={{ gap: 10, marginTop: 18, width: '100%', maxWidth: 320 }}>
                <Press onPress={() => { setPhase('ask'); start(); }} style={[st.btn, { backgroundColor: '#E2B54C' }]}>
                  <Text style={[st.btnText, { color: '#1A2448' }]}>{t(phase === 'install' ? 'upd.installAgain' : 'retry')}</Text>
                </Press>
                <Press onPress={() => Linking.openURL(update.page).catch(() => {})} style={st.ghost}>
                  <Text style={{ color: '#F4F6FC', fontWeight: '600' }}>{t('upd.openPage')}</Text>
                </Press>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18, justifyContent: 'center' },
  head: { alignItems: 'center', marginBottom: 18 },
  badge: { width: 66, height: 66, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  h1: { color: '#F4F6FC', fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  sub: { color: 'rgba(244,246,252,0.8)', fontSize: 14.5, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  card: { borderRadius: 22, padding: 18, gap: 14, alignSelf: 'center', width: '100%', maxWidth: 440 },
  sec: { fontSize: 13.5, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 22 },
  agree: { alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  agreeText: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12.5, textAlign: 'center', lineHeight: 19 },
  center: { alignItems: 'center' },
  ring: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#E2B54C' },
  logoIn: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  track: { width: '80%', maxWidth: 300, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 22 },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#E2B54C' },
  pct: { color: '#F4F6FC', fontSize: 15, fontWeight: '700', marginTop: 8, fontVariant: ['tabular-nums'] },
  ghost: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
});
