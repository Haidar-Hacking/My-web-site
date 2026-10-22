// الإعدادات: مقسمة لأقسام واضحة، كل خيار بسطر واحد
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Icon, Logo } from '../core/icons';
import { ACCENTS } from '../core/theme';
import { siteOf } from '../core/logic';
import { History, set, setSetting, useData } from '../core/store';
import { signOut } from '../core/account';
import { currentVersion } from '../core/updates';
import { Press, Sheet, Txt, tap, toast, useUI } from './kit';

export const VERSION = '1.1.0';

function Section({ title, children }) {
  const { c } = useUI();
  return (
    <View style={st.section}>
      <Txt style={[st.secTitle, { color: c.faint }]}>{title}</Txt>
      <View style={[st.card, { backgroundColor: c.surface2 }]}>{children}</View>
    </View>
  );
}

function Line({ icon, label, sub, children, last, onPress, danger, indent }) {
  const { c, dir } = useUI();
  const body = (
    <View style={[st.line, { flexDirection: dir }, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
      {icon ? <Icon name={icon} size={19} color={danger ? c.danger : c.accent} /> : indent ? <View style={{ width: 19 }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={danger && { color: c.danger }}>{label}</Txt>
        {sub ? <Txt style={{ color: c.faint, fontSize: 12.5, marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      {children}
    </View>
  );
  return onPress ? <Press onPress={onPress} scaleTo={0.99}>{body}</Press> : body;
}

function Toggle({ k, settings }) {
  const { c } = useUI();
  return (
    <Switch
      value={!!settings[k]}
      onValueChange={(v) => { tap('select'); setSetting(k, v); }}
      trackColor={{ true: c.accent, false: c.line }}
      thumbColor="#FFFFFF"
    />
  );
}

function Choice({ options, value, onChange }) {
  const { c, dir } = useUI();
  return (
    <View style={[st.choice, { backgroundColor: c.field, flexDirection: dir }]}>
      {options.map(([v, label]) => (
        <Press key={String(v)} onPress={() => onChange(v)} haptic="select" scaleTo={0.96} style={[st.choiceBtn, value === v && { backgroundColor: c.surface }]}>
          <Text style={[st.choiceText, { color: value === v ? c.accent : c.dim }]}>{label}</Text>
        </Press>
      ))}
    </View>
  );
}

export default function SettingsSheet({ visible, onClose }) {
  const { c, t, lang, dir, rtl, num } = useUI();
  const settings = useData('settings');
  const stats = useData('stats');
  const allow = useData('siteAllow');
  const shortcuts = useData('shortcuts');
  const account = useData('account');
  const [city, setCity] = useState(settings.city);
  useEffect(() => { if (visible) setCity(settings.city); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearHistory = () => Alert.alert(t('clearHistory'), t('clearHistoryQ'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('clear'), style: 'destructive', onPress: () => { History.clear(); toast(t('historyCleared')); } },
  ]);

  return (
    <Sheet visible={visible} onClose={onClose} full title={t('settings')}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Section title={t('set.account')}>
          <Line icon="user" label={account.name || '—'} sub={account.email} />
          <Line icon="logout" label={t('auth.logout')} danger last onPress={() => Alert.alert(t('auth.logout'), t('auth.logoutQ'), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('auth.logout'), style: 'destructive', onPress: () => { onClose(); signOut(); } },
          ])} />
        </Section>

        <Section title={t('set.general')}>
          <Line icon="globe" label={t('set.language')}>
            <Choice options={[['ar', 'العربية'], ['en', 'English']]} value={settings.lang} onChange={(v) => setSetting('lang', v)} />
          </Line>
          <Line icon="contrast" label={t('set.theme')}>
            <Choice options={[['system', t('set.auto')], ['light', t('set.light')], ['dark', t('set.dark')]]} value={settings.theme} onChange={(v) => setSetting('theme', v)} />
          </Line>
          <Line icon="sparkle" label={t('set.accent')} last={lang !== 'ar'}>
            <View style={[st.swatches, { flexDirection: dir }]}>
              {Object.keys(ACCENTS).map((k) => (
                <Press key={k} onPress={() => setSetting('accent', k)} haptic="select" style={[st.swatch, { backgroundColor: ACCENTS[k][c.dark ? 'dark' : 'light'] }, settings.accent === k && { borderColor: c.text }]}>
                  {settings.accent === k ? <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                </Press>
              ))}
            </View>
          </Line>
          {lang === 'ar' ? (
            <Line icon="calc" label={t('set.digits')} last>
              <Choice options={[['arab', '١٢٣'], ['latn', '123']]} value={settings.digits} onChange={(v) => setSetting('digits', v)} />
            </Line>
          ) : null}
        </Section>

        <Section title={t('set.search')}>
          <Line icon="search" label="DuckDuckGo" sub={t('set.engineBuiltIn')}>
            <Icon name="check" size={18} color={c.accent} strokeWidth={2.6} />
          </Line>
          <Line icon="shield" label={t('set.family')} sub={t('set.familySub')}>
            <Icon name="lock" size={17} color={c.faint} />
          </Line>
          <Line icon="sparkle" label={t('set.suggestions')} sub={t('set.suggestionsSub')} last><Toggle k="suggestions" settings={settings} /></Line>
        </Section>

        <Section title={t('set.privacy')}>
          <Line icon="shield" label={t('set.shield')} sub={t('blockedCount', num(stats.blocked || 0))}><Toggle k="shield" settings={settings} /></Line>
          <Line icon="window" label={t('set.popups')}><Toggle k="popups" settings={settings} /></Line>
          {allow.map((host) => (
            <Line key={host} icon="shieldOff" label={host} sub={t('set.allowed')}>
              <Press onPress={() => set('siteAllow', allow.filter((h) => h !== host))} hitSlop={8}><Icon name="close" size={16} color={c.faint} /></Press>
            </Line>
          ))}
          <Line icon="trash" label={t('clearHistory')} danger last onPress={clearHistory} />
        </Section>

        <Section title={t('set.start')}>
          <Line icon="sunny" label={t('set.weather')}><Toggle k="weather" settings={settings} /></Line>
          {settings.weather ? (
            <Line icon="location" label={t('set.city')}>
              <TextInput
                value={city}
                onChangeText={setCity}
                onEndEditing={() => setSetting('city', city.trim() || 'Baghdad')}
                style={[st.city, { color: c.text, backgroundColor: c.field, textAlign: rtl ? 'right' : 'left' }]}
                returnKeyType="done"
              />
            </Line>
          ) : null}
          <Line icon="quote" label={t('set.wisdom')} last={!shortcuts.length}><Toggle k="wisdom" settings={settings} /></Line>
          {shortcuts.length ? (
            <View style={st.chipsWrap}>
              <Txt style={{ color: c.faint, fontSize: 12.5, marginBottom: 8 }}>{t('set.shortcuts')}</Txt>
              <View style={[st.chips, { flexDirection: dir }]}>
                {shortcuts.map((sc) => (
                  <View key={sc.url} style={[st.chip, { backgroundColor: c.surface, flexDirection: dir }]}>
                    <Text numberOfLines={1} style={{ color: c.text, fontSize: 13, maxWidth: 110 }}>{sc.title || siteOf(sc.url)}</Text>
                    <Press onPress={() => set('shortcuts', shortcuts.filter((x) => x.url !== sc.url))} hitSlop={8}>
                      <Icon name="close" size={13} color={c.faint} />
                    </Press>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Section>

        <Section title={t('set.other')}>
          <Line icon="volume" label={t('set.haptics')} last><Toggle k="haptics" settings={settings} /></Line>
        </Section>

        <View style={st.about}>
          <Logo size={48} />
          <Txt align="center" style={{ fontWeight: '800', fontSize: 17, marginTop: 8 }}>GB Browser</Txt>
          <Txt align="center" style={{ color: c.faint, fontSize: 13 }}>{t('version', num(currentVersion()))}</Txt>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const st = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 14 },
  secTitle: { fontSize: 12.5, fontWeight: '700', marginBottom: 6, paddingHorizontal: 4 },
  card: { borderRadius: 16, paddingHorizontal: 14 },
  line: { alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8 },
  choice: { borderRadius: 10, padding: 2 },
  choiceBtn: { paddingHorizontal: 10, height: 30, borderRadius: 8, justifyContent: 'center' },
  choiceText: { fontSize: 13, fontWeight: '600' },
  swatches: { gap: 7 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  city: { width: 130, height: 34, borderRadius: 10, paddingHorizontal: 10, fontSize: 14 },
  chipsWrap: { paddingVertical: 12 },
  chips: { flexWrap: 'wrap', gap: 8 },
  chip: { alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  about: { alignItems: 'center', paddingTop: 26 },
});
