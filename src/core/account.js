// حساب المستخدم: ينحفظ على الجهاز، وكلمة السر تنحفظ مشفّرة (SHA-256 مع ملح)، مو كنص.
import * as Crypto from 'expo-crypto';
import { get, set } from './store';

const hash = (salt, password) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
export const hasAccount = () => !!get('account').hash;
export const isSignedIn = () => hasAccount() && !!get('auth').in;
const cleanEmail = (e) => String(e || '').trim().toLowerCase();

export async function register({ name, email, password }) {
  if (String(name || '').trim().length < 2) return 'name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(email))) return 'email';
  if (String(password || '').length < 6) return 'password';
  const salt = Crypto.randomUUID();
  set('account', { name: name.trim(), email: cleanEmail(email), salt, hash: await hash(salt, password), created: Date.now() });
  set('auth', { in: true });
  return null;
}

export async function signIn({ email, password }) {
  const acc = get('account');
  if (!acc.hash || cleanEmail(email) !== acc.email) return 'wrong';
  if ((await hash(acc.salt, password)) !== acc.hash) return 'wrong';
  set('auth', { in: true });
  return null;
}

export const signOut = () => set('auth', { in: false });
export function deleteAccount() { set('account', {}); set('auth', { in: false }); }
