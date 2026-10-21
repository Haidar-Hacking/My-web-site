// عرض التبويبات: بطاقات مرتبة بعمودين، اسحب البطاقة للجانب حتى تسكّرها
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core/icons';
import { isInternal, letterOf, siteOf } from '../core/logic';
import { Press, Txt, tap, useUI } from './kit';

const COLORS = ['#3456D1', '#1C7F66', '#B5841C', '#A93556', '#6A45D0', '#127F92', '#C2553A', '#4B5B86'];
export const colorFor = (text) => COLORS[[...String(text || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];

function Card({ tab, active, width, index, onOpen, onClose }) {
  const { c, t, dir, rtl } = useUI();
  const x = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const gone = useRef(false);

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 280, delay: Math.min(index, 8) * 30, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, index]);

  const close = (dir = 1) => {
    if (gone.current) return;
    gone.current = true;
    tap('light');
    Animated.parallel([
      Animated.timing(x, { toValue: dir * width * 1.3, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(enter, { toValue: 0, duration: 190, useNativeDriver: true }),
    ]).start(() => onClose(tab.id));
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderMove: (_e, g) => x.setValue(g.dx),
    onPanResponderRelease: (_e, g) => {
      if (Math.abs(g.dx) > width * 0.4 || Math.abs(g.vx) > 0.9) close(g.dx > 0 ? 1 : -1);
      else Animated.spring(x, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 260 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  })).current;

  const internal = isInternal(tab.url);
  const title = internal ? t(tab.private ? 'privateTab' : 'newTab') : tab.title || siteOf(tab.url);
  const color = internal ? (tab.private ? '#4A2F8A' : '#1B2C74') : colorFor(siteOf(tab.url));
  const fade = x.interpolate({ inputRange: [-width, 0, width], outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' });

  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        width, opacity: Animated.multiply(enter, fade),
        transform: [{ translateX: x }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
      }}
    >
      <Press onPress={() => onOpen(tab.id)} scaleTo={0.96} style={[st.card, { backgroundColor: c.surface, borderColor: active ? c.accent : c.lineSoft }]}>
        <View style={[st.cardTop, { flexDirection: dir }]}>
          <Text numberOfLines={1} style={[st.cardTitle, { color: c.text, textAlign: rtl ? 'right' : 'left' }]}>{title}</Text>
          <Press onPress={() => close(1)} hitSlop={10} style={st.x} accessibilityLabel={t('closeTab')}>
            <Icon name="close" size={14} color={c.dim} />
          </Press>
        </View>
        <View style={[st.face, { backgroundColor: color }]}>
          {internal ? <Icon name={tab.private ? 'mask' : 'home'} size={30} color="rgba(255,255,255,0.9)" /> : (
            <Text style={st.faceLetter}>{letterOf(tab.title, tab.url)}</Text>
          )}
          {!internal ? <Text numberOfLines={1} style={st.faceSite}>{siteOf(tab.url)}</Text> : null}
        </View>
      </Press>
    </Animated.View>
  );
}

export default function TabSwitcher({ visible, tabs, activeId, privateMode, onClose, onOpen, onCloseTab, onNew, onCloseAll, onMode }) {
  const { c, t, dir, num } = useUI();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [shown, setShown] = useState(visible);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShown(true);
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (shown) {
      Animated.timing(fade, { toValue: 0, duration: 170, useNativeDriver: true }).start(() => setShown(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  const list = tabs.filter((x) => !!x.private === privateMode);
  const cols = width > 700 ? 4 : width > 500 ? 3 : 2;
  const gap = 12;
  const cardW = (Math.min(width, 900) - 32 - gap * (cols - 1)) / cols;
  const normalCount = tabs.filter((x) => !x.private).length;
  const privCount = tabs.length - normalCount;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.frame, opacity: fade }]}>
        <Animated.View style={{ flex: 1, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }] }}>
          <View style={[st.head, { paddingTop: insets.top + 8 }]}>
            <View style={[st.seg, { backgroundColor: c.field }]}>
              {[false, true].map((p) => {
                const on = privateMode === p;
                return (
                  <Press key={String(p)} onPress={() => onMode(p)} haptic="select" scaleTo={0.97} style={[st.segBtn, on && { backgroundColor: c.surface }, { flexDirection: dir }]}>
                    <Icon name={p ? 'mask' : 'window'} size={16} color={on ? c.accent : c.dim} />
                    <Text style={[st.segText, { color: on ? c.text : c.dim }]}>{t(p ? 'private' : 'tabs')} {num(p ? privCount : normalCount)}</Text>
                  </Press>
                );
              })}
            </View>
          </View>
          <ScrollView contentContainerStyle={[st.grid, { flexDirection: dir, gap }]}>
            {list.map((tab, i) => (
              <Card key={tab.id} tab={tab} index={i} width={cardW} active={tab.id === activeId} onOpen={onOpen} onClose={onCloseTab} />
            ))}
            {!list.length ? (
              <View style={st.empty}>
                <Icon name={privateMode ? 'mask' : 'window'} size={40} color={c.faint} />
                <Txt align="center" style={{ color: c.dim, marginTop: 10 }}>{t(privateMode ? 'noPrivateTabs' : 'noTabs')}</Txt>
              </View>
            ) : null}
          </ScrollView>
          <View style={[st.foot, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: c.bar, borderTopColor: c.lineSoft, flexDirection: dir }]}>
            <Press onPress={onCloseAll} disabled={!list.length} style={st.footBtn}>
              <Txt style={{ color: c.danger, fontWeight: '600' }}>{t('closeAll')}</Txt>
            </Press>
            <Press onPress={() => onNew(privateMode)} haptic="medium" style={[st.plus, { backgroundColor: c.accent }]} accessibilityLabel={t('newTab')}>
              <Icon name="plus" size={26} color={c.accentInk} strokeWidth={2.4} />
            </Press>
            <Press onPress={onClose} style={st.footBtn}>
              <Txt align="center" style={{ color: c.accent, fontWeight: '700' }}>{t('done')}</Txt>
            </Press>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  head: { alignItems: 'center', paddingBottom: 10, paddingHorizontal: 16 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3, width: '100%', maxWidth: 360 },
  segBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  segText: { fontSize: 14, fontWeight: '600' },
  grid: { flexWrap: 'wrap', padding: 16, paddingBottom: 30, alignSelf: 'center', maxWidth: 900, width: '100%' },
  card: { borderRadius: 16, borderWidth: 2, overflow: 'hidden', shadowColor: '#0A1230', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardTop: { alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, gap: 6 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  x: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  face: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 6 },
  faceLetter: { color: '#FFFFFF', fontSize: 44, fontWeight: '800' },
  faceSite: { color: 'rgba(255,255,255,0.85)', fontSize: 12, maxWidth: '86%' },
  empty: { width: '100%', alignItems: 'center', paddingTop: 90 },
  foot: { alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  footBtn: { minWidth: 86, height: 44, justifyContent: 'center' },
  plus: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', shadowColor: '#0A1230', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
});
