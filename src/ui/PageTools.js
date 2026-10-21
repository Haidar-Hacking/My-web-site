// لوحة الدرع لكل موقع، وشريط البحث داخل الصفحة
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core/icons';
import { siteOf } from '../core/logic';
import { get, useData } from '../core/store';
import { Press, Sheet, Txt, useUI } from './kit';

export function ShieldSheet({ visible, tab, onClose, onSiteToggle }) {
  const { c, t, dir, num } = useUI();
  const settings = useData('settings');
  const stats = useData('stats');
  const allow = useData('siteAllow');
  const host = siteOf(tab.url);
  const on = settings.shield && !allow.includes(host);
  const n = tab.blocked || 0;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={st.hero}>
        <View style={[st.badge, { backgroundColor: on ? c.accentSoft : c.field }]}>
          <Icon name={on ? 'shield' : 'shieldOff'} size={34} color={on ? c.gold : c.faint} />
        </View>
        <Text style={[st.big, { color: c.text }]}>{num(on ? n : 0)}</Text>
        <Txt align="center" style={{ color: c.dim }}>{on ? t('shieldPage') : t('shieldOffHere')}</Txt>
      </View>
      <View style={[st.card, { backgroundColor: c.surface2 }]}>
        <View style={[st.line, { flexDirection: dir }]}>
          <Icon name="globe" size={19} color={c.accent} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontWeight: '600' }}>{host}</Txt>
            <Txt style={{ color: c.faint, fontSize: 12.5 }}>{t('shieldSite')}</Txt>
          </View>
          <Switch
            value={on}
            disabled={!settings.shield}
            onValueChange={(v) => onSiteToggle(host, v)}
            trackColor={{ true: c.accent, false: c.line }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
      <Txt align="center" style={{ color: c.faint, fontSize: 12.5, marginTop: 12, marginBottom: 6 }}>
        {settings.shield ? t('blockedCount', num(stats.blocked || 0)) : t('shieldDisabled')}
      </Txt>
    </Sheet>
  );
}

export function FindBar({ visible, result, onQuery, onStep, onClose }) {
  const { c, t, dir, rtl, num } = useUI();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const input = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (visible) { setQ(''); setTimeout(() => input.current && input.current.focus(), 80); }
  }, [visible]);

  if (!visible) return null;
  const change = (v) => {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onQuery(v), 180);
  };
  const flip = rtl ? { transform: [{ rotate: '180deg' }] } : null;

  return (
    <View style={[st.find, { backgroundColor: c.bar, borderTopColor: c.lineSoft, paddingBottom: Math.max(insets.bottom, 8), flexDirection: dir }]}>
      <View style={[st.field, { backgroundColor: c.field, flexDirection: dir }]}>
        <Icon name="search" size={16} color={c.faint} />
        <TextInput
          ref={input}
          value={q}
          onChangeText={change}
          onSubmitEditing={() => onStep(1)}
          placeholder={t('findInPage')}
          placeholderTextColor={c.faint}
          style={[st.input, { color: c.text, textAlign: rtl ? 'right' : 'left' }]}
          returnKeyType="search"
          submitBehavior="submit"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q ? <Text style={[st.count, { color: result.n ? c.dim : c.danger }]}>{num(result.i)}/{num(result.n)}</Text> : null}
      </View>
      <Press onPress={() => onStep(-1)} disabled={!result.n} style={st.btn}><Icon name="chevUp" size={20} color={c.text} style={flip} /></Press>
      <Press onPress={() => onStep(1)} disabled={!result.n} style={st.btn}><Icon name="chevDown" size={20} color={c.text} style={flip} /></Press>
      <Press onPress={onClose} style={st.btn}><Txt style={{ color: c.accent, fontWeight: '700' }}>{t('done')}</Txt></Press>
    </View>
  );
}

export const allowListHas = (host) => get('siteAllow').includes(host);

const st = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 16, gap: 4 },
  badge: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  big: { fontSize: 40, fontWeight: '200', fontVariant: ['tabular-nums'] },
  card: { marginHorizontal: 16, borderRadius: 16, paddingHorizontal: 14 },
  line: { alignItems: 'center', gap: 12, minHeight: 60 },
  find: { alignItems: 'center', gap: 4, paddingTop: 8, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth },
  field: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  input: { flex: 1, height: 42, fontSize: 15 },
  count: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  btn: { minWidth: 40, height: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
