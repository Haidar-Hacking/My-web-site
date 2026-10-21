// المكتبة: المفضلة والسجل وقائمة القراءة في مكان واحد
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../core/icons';
import { MONTHS, letterOf, normalize, prettyURL, siteOf } from '../core/logic';
import { Bookmarks, History, ReadLater, useData } from '../core/store';
import { colorFor } from './TabSwitcher';
import { Press, Sheet, Txt, toast, useUI } from './kit';

const SECTIONS = [['bookmarks', 'star'], ['history', 'history'], ['readLater', 'bookmark']];

function dayLabel(ts, t, lang, num) {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (diff <= 0) return t('today');
  if (diff === 1) return t('yesterday');
  return `${num(d.getDate())} ${MONTHS[lang === 'ar' ? 'ar' : 'en'][d.getMonth()]}`;
}

export default function Library({ visible, section, onClose, onOpen }) {
  const { c, t, lang, dir, rtl, num } = useUI();
  const [tab, setTab] = useState(section || 'bookmarks');
  const [q, setQ] = useState('');
  const bookmarks = useData('bookmarks');
  const history = useData('history');
  const later = useData('readLater');

  useEffect(() => { if (visible) { setTab(section || 'bookmarks'); setQ(''); } }, [visible, section]);

  const nq = normalize(q);
  const match = (x) => !nq || normalize(x.title).includes(nq) || x.url.toLowerCase().includes(nq);
  let data = (tab === 'bookmarks' ? bookmarks : tab === 'history' ? history.slice(0, 600) : later).filter(match);
  if (tab === 'history') {
    const out = [];
    let last = '';
    data.forEach((h) => {
      const label = dayLabel(h.ts, t, lang, num);
      if (label !== last) { out.push({ header: label, key: 'h' + label }); last = label; }
      out.push(h);
    });
    data = out;
  }

  const remove = (item) => {
    if (tab === 'bookmarks') Bookmarks.remove(item.id);
    else if (tab === 'history') History.remove(item.url);
    else ReadLater.remove(item.id);
    toast(t('removed'));
  };
  const clearHistory = () => {
    Alert.alert(t('clearHistory'), t('clearHistoryQ'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clear'), style: 'destructive', onPress: () => { History.clear(); toast(t('historyCleared')); } },
    ]);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      full
      title={t('library')}
      right={tab === 'history' && history.length ? (
        <Press onPress={clearHistory} hitSlop={8}><Txt style={{ color: c.danger, fontWeight: '600', fontSize: 14 }}>{t('clear')}</Txt></Press>
      ) : null}
    >
      <View style={[st.seg, { backgroundColor: c.field, flexDirection: dir }]}>
        {SECTIONS.map(([key, icon]) => {
          const on = tab === key;
          return (
            <Press key={key} onPress={() => setTab(key)} haptic="select" scaleTo={0.97} style={[st.segBtn, { flexDirection: dir }, on && { backgroundColor: c.surface }]}>
              <Icon name={icon} size={15} color={on ? c.accent : c.dim} />
              <Text style={[st.segText, { color: on ? c.text : c.dim }]} numberOfLines={1}>{t(key)}</Text>
            </Press>
          );
        })}
      </View>
      <View style={[st.search, { backgroundColor: c.field, flexDirection: dir }]}>
        <Icon name="search" size={16} color={c.faint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('searchIn', t(tab))}
          placeholderTextColor={c.faint}
          style={[st.input, { color: c.text, textAlign: rtl ? 'right' : 'left' }]}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(it, i) => it.key || it.id || it.url + i}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => item.header ? (
          <Txt style={[st.day, { color: c.faint }]}>{item.header}</Txt>
        ) : (
          <Press onPress={() => onOpen(item.url)} onLongPress={() => remove(item)} scaleTo={0.98} style={[st.row, { flexDirection: dir }]}>
            <View style={[st.letter, { backgroundColor: colorFor(siteOf(item.url)) }]}>
              <Text style={st.letterText}>{letterOf(item.title, item.url)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={item.read && { color: c.faint }}>{item.title || siteOf(item.url)}</Txt>
              <Txt numberOfLines={1} style={{ color: c.faint, fontSize: 12.5 }}>{prettyURL(item.url)}</Txt>
            </View>
            {tab === 'readLater' ? (
              <Press onPress={() => ReadLater.mark(item.id, !item.read)} hitSlop={8} style={st.act}>
                <Icon name="check" size={17} color={item.read ? c.accent : c.faint} />
              </Press>
            ) : null}
            <Press onPress={() => remove(item)} hitSlop={8} style={st.act} accessibilityLabel={t('remove')}>
              <Icon name="close" size={16} color={c.faint} />
            </Press>
          </Press>
        )}
        ListEmptyComponent={(
          <View style={st.empty}>
            <Icon name={SECTIONS.find((x) => x[0] === tab)[1]} size={40} color={c.line} />
            <Txt align="center" style={{ color: c.dim, marginTop: 10 }}>{nq ? t('noResults') : t('empty.' + tab)}</Txt>
          </View>
        )}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  seg: { marginHorizontal: 16, borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  segText: { fontSize: 13.5, fontWeight: '600' },
  search: { marginHorizontal: 16, marginTop: 10, marginBottom: 4, height: 40, borderRadius: 12, alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, height: 40, fontSize: 15 },
  day: { fontSize: 12.5, fontWeight: '700', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  row: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, minHeight: 56 },
  letter: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  letterText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  act: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 70 },
});
