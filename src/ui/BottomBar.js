// الشريط السفلي: العنوان وأزرار التنقل في متناول الإبهام
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core/icons';
import { isInternal, prettyURL, searchQueryOf, siteOf } from '../core/logic';
import { Press, useUI } from './kit';

function Progress({ value, loading }) {
  const { c, rtl } = useUI();
  const v = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading) {
      Animated.timing(o, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      Animated.timing(v, { toValue: Math.max(0.08, value), duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
        Animated.timing(o, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => v.setValue(0));
      });
    }
  }, [value, loading, o, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[st.progress, { backgroundColor: c.accent, opacity: o, transformOrigin: rtl ? 'right' : 'left', transform: [{ scaleX: v }] }]}
    />
  );
}

function ShieldBadge({ n, on }) {
  const { c, num } = useUI();
  const scale = useRef(new Animated.Value(1)).current;
  const last = useRef(n);
  useEffect(() => {
    if (n > last.current) {
      scale.setValue(1.3);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }).start();
    }
    last.current = n;
  }, [n, scale]);
  return (
    <Animated.View style={[st.shield, { transform: [{ scale }] }]}>
      <Icon name={on ? 'shield' : 'shieldOff'} size={17} color={n > 0 && on ? c.gold : c.faint} />
      {n > 0 && on ? <Text style={[st.count, { color: c.gold }]}>{n > 99 ? num(99) + '+' : num(n)}</Text> : null}
    </Animated.View>
  );
}

export default function BottomBar({ tab, tabCount, shieldOn, onAddress, onShield, onBack, onForward, onShare, onTabs, onMenu, onReload, onSwipe, onNewTab }) {
  const { c, t, dir } = useUI();
  // Swipe the address pill sideways to move to the next or previous tab.
  const dx = useRef(new Animated.Value(0)).current;
  const swipe = useRef(onSwipe);
  swipe.current = onSwipe;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_e, g) => dx.setValue(Math.max(-60, Math.min(60, g.dx * 0.5))),
    onPanResponderRelease: (_e, g) => {
      if (Math.abs(g.dx) > 70 && swipe.current) swipe.current(g.dx < 0 ? 1 : -1);
      Animated.spring(dx, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 220 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const insets = useSafeAreaInsets();
  const internal = isInternal(tab.url);
  const secure = /^https:/.test(tab.url);
  const query = !internal && searchQueryOf(tab.url);
  const label = internal ? t('searchPlaceholder') : query || siteOf(tab.url) || prettyURL(tab.url);
  const flip = dir === 'row-reverse' ? { transform: [{ scaleX: -1 }] } : null;

  return (
    <View style={[st.bar, { backgroundColor: c.bar, paddingBottom: Math.max(insets.bottom, 8), borderTopColor: c.lineSoft }]}>
      <Progress value={tab.progress || 0} loading={!!tab.loading && !internal} />
      <Animated.View {...pan.panHandlers} style={[st.pill, { backgroundColor: c.field, flexDirection: dir, transform: [{ translateX: dx }] }]}>
        {internal ? (
          <View style={st.side}><Icon name="search" size={17} color={c.faint} /></View>
        ) : (
          <Press onPress={onShield} style={st.side} hitSlop={10} accessibilityLabel={t('shield')}>
            <ShieldBadge n={tab.blocked || 0} on={shieldOn} />
          </Press>
        )}
        <Press onPress={onAddress} scaleTo={0.98} style={[st.addr, { flexDirection: dir }]}>
          {query ? <Icon name="search" size={14} color={c.accent} /> : !internal ? <Icon name={secure ? 'lock' : 'warn'} size={13} color={secure ? c.faint : c.danger} /> : null}
          <Text numberOfLines={1} style={[st.addrText, { color: internal ? c.faint : c.text }]}>{label}</Text>
        </Press>
        {!internal ? (
          <Press onPress={onReload} style={st.side} hitSlop={10} accessibilityLabel={tab.loading ? t('stop') : t('reload')}>
            <Icon name={tab.loading ? 'close' : 'reload'} size={18} color={c.dim} />
          </Press>
        ) : <View style={st.side} />}
      </Animated.View>
      <View style={[st.nav, { flexDirection: dir }]}>
        <Press onPress={onBack} disabled={!tab.canBack} style={st.btn} accessibilityLabel={t('back')}>
          <Icon name="back" size={23} color={c.text} style={flip} />
        </Press>
        <Press onPress={onForward} disabled={!tab.canFwd} style={st.btn} accessibilityLabel={t('forward')}>
          <Icon name="forward" size={23} color={c.text} style={flip} />
        </Press>
        <Press onPress={onShare} disabled={internal} style={st.btn} accessibilityLabel={t('share')}>
          <Icon name="external" size={22} color={c.text} />
        </Press>
        <Press onPress={onTabs} onLongPress={onNewTab} style={st.btn} haptic="light" accessibilityLabel={t('tabs')}>
          <View style={[st.tabsBox, { borderColor: c.text }]}>
            <Text style={[st.tabsNum, { color: c.text }]}>{tabCount > 99 ? ':D' : tabCount}</Text>
          </View>
        </Press>
        <Press onPress={onMenu} style={st.btn} accessibilityLabel={t('menu')}>
          <Icon name="dots" size={23} color={c.text} style={{ transform: [{ rotate: '90deg' }] }} />
        </Press>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { paddingTop: 8, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth },
  progress: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5 },
  pill: { height: 44, borderRadius: 14, alignItems: 'center', paddingHorizontal: 4 },
  side: { width: 46, height: 44, alignItems: 'center', justifyContent: 'center' },
  addr: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', gap: 6 },
  addrText: { fontSize: 15.5, fontWeight: '500', maxWidth: '90%' },
  shield: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  count: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  nav: { justifyContent: 'space-around', alignItems: 'center', marginTop: 6, height: 44 },
  btn: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabsBox: { minWidth: 24, height: 24, paddingHorizontal: 4, borderWidth: 2, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  tabsNum: { fontSize: 12, fontWeight: '800' },
});
