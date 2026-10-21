// عناصر الواجهة المشتركة: ضغطة متحركة، لوحة سفلية ناعمة، صف قائمة، رسالة عابرة
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, Dimensions, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core/icons';
import { get } from '../core/store';

export const Ctx = createContext(null);
export const useUI = () => useContext(Ctx);

export function tap(kind = 'light') {
  if (!get('settings').haptics) return;
  try {
    if (kind === 'select') Haptics.selectionAsync();
    else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch { /* no haptics on this device */ }
}

// A button that shrinks slightly while pressed.
const APressable = Animated.createAnimatedComponent(Pressable);
export function Press({ onPress, onLongPress, style, children, disabled, haptic, scaleTo = 0.94, hitSlop = 6, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 6 : 0 }).start();
  return (
    <APressable
      onPress={() => { if (haptic) tap(haptic); if (onPress) onPress(); }}
      onLongPress={onLongPress}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.4 }]}
    >
      {children}
    </APressable>
  );
}

export function Txt({ style, children, numberOfLines, align, selectable }) {
  const { c, rtl } = useUI();
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[{ color: c.text, fontSize: 15, textAlign: align || (rtl ? 'right' : 'left'), writingDirection: rtl ? 'rtl' : 'ltr' }, style]}
    >
      {children}
    </Text>
  );
}

// Bottom sheet with a fading backdrop; drag the handle down to close.
export function Sheet({ visible, onClose, children, full, title, right }) {
  const { c, dir } = useUI();
  const insets = useSafeAreaInsets();
  const H = Dimensions.get('window').height;
  const y = useRef(new Animated.Value(H)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShown(true);
      y.setValue(H * 0.5);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (shown) {
      Animated.parallel([
        Animated.timing(y, { toValue: H * 0.6, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setShown(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_e, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_e, g) => {
      if (g.dy > 110 || g.vy > 1.1) onClose();
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }).start();
    },
  })).current;

  if (!shown) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          s.sheet,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + 10, transform: [{ translateY: y }] },
          full && { top: insets.top + 12, maxHeight: '100%' },
        ]}
      >
        <View {...pan.panHandlers} style={s.handleZone}>
          <View style={[s.handle, { backgroundColor: c.line }]} />
          {title ? (
            <View style={[s.titleRow, { flexDirection: dir }]}>
              <Txt style={{ fontSize: 18, fontWeight: '700', flex: 1 }}>{title}</Txt>
              {right}
            </View>
          ) : null}
        </View>
        {children}
      </Animated.View>
      <ToastHost bottom={insets.bottom + 24} active={visible} />
    </Modal>
  );
}

export function Row({ icon, label, sub, onPress, onLongPress, right, danger, color }) {
  const { c, dir } = useUI();
  return (
    <Press onPress={onPress} onLongPress={onLongPress} scaleTo={0.98} style={[s.row, { flexDirection: dir }]}>
      {icon ? <View style={[s.rowIc, { backgroundColor: c.accentSoft }]}><Icon name={icon} size={19} color={danger ? c.danger : color || c.accent} /></View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={danger && { color: c.danger }}>{label}</Txt>
        {sub ? <Txt numberOfLines={1} style={{ color: c.faint, fontSize: 12.5, marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      {right}
    </Press>
  );
}

// Toasts: one at a time, shown by the top-most host (the main screen, or the open sheet).
const hosts = [];
export const toast = (msg, action) => { const h = hosts[hosts.length - 1]; if (h) h(msg, action); };

export function ToastHost({ bottom, active = true }) {
  const { c, dir } = useUI();
  const [item, setItem] = useState(null);
  const y = useRef(new Animated.Value(30)).current;
  const o = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const show = (msg, action) => {
      clearTimeout(timer.current);
      setItem({ msg, action, key: Date.now() });
      y.setValue(24);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 260 }),
        Animated.timing(o, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.timing(o, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setItem(null));
      }, action ? 4500 : 3000);
    };
    hosts.push(show);
    return () => { const i = hosts.lastIndexOf(show); if (i >= 0) hosts.splice(i, 1); };
  }, [active, o, y]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!item) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[s.toastWrap, { bottom, opacity: o, transform: [{ translateY: y }] }]}>
      <View style={[s.toast, { flexDirection: dir, backgroundColor: c.dark ? '#E9EDF8' : '#1E2747' }]}>
        <Text style={{ color: c.dark ? '#18203A' : '#EEF1FA', fontSize: 14, flexShrink: 1 }}>{item.msg}</Text>
        {item.action ? (
          <Pressable onPress={() => { item.action.run(); setItem(null); }} hitSlop={8}>
            <Text style={{ color: c.dark ? '#3456D1' : '#9DB0FF', fontWeight: '700', fontSize: 14 }}>{item.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '92%', overflow: 'hidden' },
  handleZone: { paddingTop: 8, paddingBottom: 4, paddingHorizontal: 18 },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, marginBottom: 4 },
  row: { alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 54 },
  rowIc: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, maxWidth: 520, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
