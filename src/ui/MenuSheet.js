// القائمة: أدوات الصفحة بمربعات مرتبة، ثم المكتبة والإعدادات
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Icon, Logo } from '../core/icons';
import { isInternal, letterOf, prettyURL, siteOf } from '../core/logic';
import { Bookmarks, ReadLater, get, useData } from '../core/store';
import { colorFor } from './TabSwitcher';
import { Press, Row, Sheet, Txt, useUI } from './kit';

function Tile({ icon, label, onPress, on, disabled }) {
  const { c } = useUI();
  return (
    <Press onPress={onPress} disabled={disabled} haptic="light" scaleTo={0.92} style={st.tile}>
      <View style={[st.tileIc, { backgroundColor: on ? c.accent : c.surface2 }]}>
        <Icon name={icon} size={21} color={on ? c.accentInk : c.text} />
      </View>
      <Text numberOfLines={1} style={[st.tileLabel, { color: c.dim }]}>{label}</Text>
    </Press>
  );
}

export default function MenuSheet({ visible, tab, onClose, act }) {
  const { c, t, dir, num, lang } = useUI();
  useData('bookmarks');
  useData('readLater');
  const settings = useData('settings');
  const internal = isInternal(tab.url);
  const marked = !internal && Bookmarks.has(tab.url);
  const saved = !internal && get('readLater').some((x) => x.url === tab.url);
  const pinned = !internal && get('shortcuts').some((x) => x.url === tab.url);
  const run = (fn, keepOpen) => () => { if (!keepOpen) onClose(); setTimeout(fn, keepOpen ? 0 : 160); };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={[st.head, { flexDirection: dir }]}>
        {internal ? <Logo size={38} /> : (
          <View style={[st.site, { backgroundColor: colorFor(siteOf(tab.url)) }]}>
            <Text style={st.siteLetter}>{letterOf(tab.title, tab.url)}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt numberOfLines={1} style={{ fontWeight: '700', fontSize: 16 }}>{internal ? 'GB Browser' : tab.title || siteOf(tab.url)}</Txt>
          <Txt numberOfLines={1} style={{ color: c.faint, fontSize: 12.5 }}>{internal ? t(tab.private ? 'privateTab' : 'newTab') : prettyURL(tab.url)}</Txt>
        </View>
      </View>

      <View style={[st.grid, { flexDirection: dir }]}>
        <Tile icon={marked ? 'starFill' : 'star'} on={marked} label={t(marked ? 'bookmarked' : 'bookmark')} disabled={internal} onPress={run(() => act.bookmark(), true)} />
        <Tile icon="bookmark" on={saved} label={t('readLater')} disabled={internal} onPress={run(() => act.readLater(), true)} />
        <Tile icon="external" label={t('share')} disabled={internal} onPress={run(act.share)} />
        <Tile icon="copy" label={t('copyLink')} disabled={internal} onPress={run(act.copy)} />
        <Tile icon="search" label={t('findInPage')} disabled={internal} onPress={run(act.find)} />
        <Tile icon="reader" label={t('reader')} disabled={internal} onPress={run(act.reader)} />
        <Tile icon="monitor" on={!!tab.desktop} label={t('desktopSite')} disabled={internal} onPress={run(act.desktop)} />
        <Tile icon="pin" on={pinned} label={t('addToStart')} disabled={internal} onPress={run(() => act.pin(), true)} />
      </View>

      <View style={[st.tools, { borderColor: c.lineSoft }]}>
        <View style={[st.toolRow, { flexDirection: dir }]}>
          <Icon name="moon" size={19} color={c.dim} />
          <Txt style={{ flex: 1 }}>{t('darkSites')}</Txt>
          <Switch value={!!settings.darkSites} onValueChange={act.darkSites} trackColor={{ true: c.accent, false: c.line }} thumbColor="#FFFFFF" />
        </View>
        <View style={[st.toolRow, { flexDirection: dir }]}>
          <Icon name="text" size={19} color={c.dim} />
          <Txt style={{ flex: 1 }}>{t('textSize')}</Txt>
          <View style={[st.stepper, { backgroundColor: c.field, flexDirection: dir }]}>
            <Press onPress={() => act.textSize(-10)} disabled={settings.textSize <= 70} style={st.step} haptic="select"><Icon name="minus" size={16} color={c.text} /></Press>
            <Text style={[st.pct, { color: c.text }]}>{num(settings.textSize)}{lang === 'ar' ? '٪' : '%'}</Text>
            <Press onPress={() => act.textSize(10)} disabled={settings.textSize >= 200} style={st.step} haptic="select"><Icon name="plus" size={16} color={c.text} /></Press>
          </View>
        </View>
      </View>

      <View style={[st.lib, { flexDirection: dir }]}>
        {[['bookmarks', 'star'], ['history', 'history'], ['readLater', 'bookmark']].map(([key, icon]) => (
          <Press key={key} onPress={run(() => act.library(key))} scaleTo={0.95} style={[st.libBtn, { backgroundColor: c.surface2 }]}>
            <Icon name={icon} size={19} color={c.accent} />
            <Text numberOfLines={1} style={[st.libText, { color: c.text }]}>{t(key)}</Text>
          </Press>
        ))}
      </View>

      <Row icon="mask" label={t('newPrivateTab')} onPress={run(act.privateTab)} color={c.dark ? '#A68CFF' : '#6A45D0'} />
      <Row icon="sliders" label={t('settings')} onPress={run(act.settings)} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  head: { alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  site: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  siteLetter: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  grid: { flexWrap: 'wrap', paddingHorizontal: 10 },
  tile: { width: '25%', alignItems: 'center', paddingVertical: 8, gap: 6 },
  tileIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 11.5, maxWidth: 84, textAlign: 'center' },
  tools: { marginHorizontal: 16, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  toolRow: { alignItems: 'center', gap: 12, minHeight: 50 },
  stepper: { alignItems: 'center', borderRadius: 12, height: 36 },
  step: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  pct: { minWidth: 50, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
  lib: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  libBtn: { flex: 1, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 5 },
  libText: { fontSize: 12.5, fontWeight: '600' },
});
