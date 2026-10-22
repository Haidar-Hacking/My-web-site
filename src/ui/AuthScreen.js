// شاشة الدخول: أول مرة تسوي حساب، وبعدها تدخل بالإيميل وكلمة السر
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Logo } from '../core/icons';
import { continueAsGuest, deleteAccount, hasAccount, register, signIn } from '../core/account';
import { PRIVACY_URL } from '../core/config';
import { get } from '../core/store';
import { Press, tap, useUI } from './kit';

function Field({ icon, value, onChange, placeholder, secure, keyboard, onSubmit, auto }) {
  const { c, dir, rtl } = useUI();
  const [show, setShow] = useState(false);
  return (
    <View style={[st.field, { backgroundColor: c.field, flexDirection: dir }]}>
      <Icon name={icon} size={18} color={c.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        secureTextEntry={secure && !show}
        keyboardType={keyboard}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={auto}
        onSubmitEditing={onSubmit}
        style={[st.input, { color: c.text, textAlign: rtl && !secure && keyboard !== 'email-address' ? 'right' : 'left' }]}
      />
      {secure ? (
        <Press onPress={() => setShow((x) => !x)} hitSlop={8} style={st.eye}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} color={c.faint} />
        </Press>
      ) : null}
    </View>
  );
}

export default function AuthScreen({ onDone }) {
  const { c, t, rtl } = useUI();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(hasAccount() ? 'login' : 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(hasAccount() ? get('account').email : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const register_ = mode === 'register';

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const err = register_ ? await register({ name, email, password }) : await signIn({ email, password });
    setBusy(false);
    if (err) { tap('medium'); setError(t('auth.err.' + err)); return; }
    tap('select');
    onDone();
  };
  const forgot = () => Alert.alert(t('auth.forgotTitle'), t('auth.forgotText'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('auth.newAccount'), style: 'destructive', onPress: () => { deleteAccount(); setMode('register'); setEmail(''); setPassword(''); setError(''); } },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={[c.lapisTop, c.lapisBottom]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[st.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
          <Logo size={78} />
          <Text style={st.brand}>GB Browser</Text>
          <Text style={st.tag}>{t(register_ ? 'auth.welcome' : 'auth.welcomeBack', register_ ? '' : get('account').name || '')}</Text>

          <View style={[st.card, { backgroundColor: c.surface }]}>
            <Text style={[st.title, { color: c.text, textAlign: rtl ? 'right' : 'left' }]}>{t(register_ ? 'auth.register' : 'auth.login')}</Text>
            {register_ ? <Field icon="user" value={name} onChange={setName} placeholder={t('auth.name')} auto="name" /> : null}
            <Field icon="mail" value={email} onChange={setEmail} placeholder={t('auth.email')} keyboard="email-address" auto="email" />
            <Field icon="lock" value={password} onChange={setPassword} placeholder={t(register_ ? 'auth.newPassword' : 'auth.password')} secure onSubmit={submit} auto={register_ ? 'new-password' : 'current-password'} />
            {error ? <Text style={[st.error, { color: c.danger, textAlign: rtl ? 'right' : 'left' }]}>{error}</Text> : null}
            <Press onPress={submit} disabled={busy} scaleTo={0.97} style={[st.btn, { backgroundColor: c.accent }]}>
              <Text style={[st.btnText, { color: c.accentInk }]}>{busy ? '…' : t(register_ ? 'auth.create' : 'auth.enter')}</Text>
            </Press>
            {register_ ? (
              <>
                <Text style={[st.note, { color: c.faint }]}>{t('auth.localNote')}</Text>
                {Platform.OS === 'ios' ? (
                  <Press onPress={() => { continueAsGuest(); onDone(); }} style={st.link}><Text style={{ color: c.accent, fontWeight: '700', fontSize: 15 }}>{t('auth.guest')}</Text></Press>
                ) : null}
                <Press onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} style={st.link}><Text style={{ color: c.faint, fontSize: 13, textDecorationLine: 'underline' }}>{t('privacy')}</Text></Press>
              </>
            ) : (
              <Press onPress={forgot} style={st.link}><Text style={{ color: c.accent, fontWeight: '600', fontSize: 14 }}>{t('auth.forgot')}</Text></Press>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  scroll: { alignItems: 'center', paddingHorizontal: 20, flexGrow: 1 },
  brand: { color: '#F4F6FC', fontSize: 28, fontWeight: '800', marginTop: 14 },
  tag: { color: 'rgba(244,246,252,0.8)', fontSize: 15, marginTop: 4, marginBottom: 26, textAlign: 'center' },
  card: { width: '100%', maxWidth: 420, borderRadius: 22, padding: 20, gap: 12, shadowColor: '#050A1E', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  field: { height: 50, borderRadius: 14, alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, height: 50, fontSize: 16 },
  eye: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13.5 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 16, fontWeight: '800' },
  note: { fontSize: 12.5, textAlign: 'center', lineHeight: 19 },
  link: { alignSelf: 'center', paddingVertical: 6 },
});
