// بدل ما التطبيق يسكّر وحده، يعرض الخطأ على الشاشة حتى تصوّره، ويخليك ترجع للتطبيق.
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const format = (e) => {
  const msg = (e && (e.message || String(e))) || 'Unknown error';
  const stack = String((e && e.stack) || '').split('\n').slice(0, 8).join('\n');
  return `${msg}\n\n${stack}`;
};

// Errors outside drawing the screen (taps, timers, network) show as a message instead of closing the app.
export function installCrashGuard() {
  const EU = typeof globalThis !== 'undefined' ? globalThis.ErrorUtils : undefined;
  if (!EU || !EU.setGlobalHandler) return;
  let shown = false;
  EU.setGlobalHandler((error) => {
    if (shown) return;
    shown = true;
    Alert.alert('GB Browser — صار خطأ', format(error).slice(0, 900), [{ text: 'OK', onPress: () => { shown = false; } }]);
  });
}

export class CrashScreen extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch() { /* shown on screen */ }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={st.wrap}>
        <Text style={st.h}>صار خطأ بالتطبيق</Text>
        <Text style={st.p}>صوّر هاي الشاشة ودزها، وبعدين اضغط الزر حتى ترجع.</Text>
        <ScrollView style={st.box}><Text selectable style={st.code}>{format(this.state.error)}</Text></ScrollView>
        <TouchableOpacity onPress={() => this.setState({ error: null })} style={st.btn}>
          <Text style={st.btnText}>رجوع للتطبيق</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0F1840', padding: 24, paddingTop: 70 },
  h: { color: '#F4F6FC', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  p: { color: 'rgba(244,246,252,0.8)', fontSize: 14, marginTop: 6, textAlign: 'right' },
  box: { flex: 1, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 },
  code: { color: '#FFD98A', fontSize: 12.5, fontFamily: 'monospace' },
  btn: { marginTop: 16, height: 50, borderRadius: 14, backgroundColor: '#E2B54C', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#1A2448', fontSize: 16, fontWeight: '800' },
});
