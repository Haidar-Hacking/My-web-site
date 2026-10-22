// حساب المستخدم: ينحفظ على الجهاز، وكلمة السر تنحفظ مشفّرة (SHA-256 مع ملح)، مو كنص.
import * as Crypto from 'expo-crypto';
import { get, set } from './store';

const hash = (salt, password) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
export const hasAccount = () => !!get('account').hash;
export const isGuest = () => !!get('auth').guest && !hasAccount();
export const isSignedIn = () => (hasAccount() && !!get('auth').in) || isGuest();
// Using the browser without an account (App Store rule 5.1.1: sign-in can't be forced when the app works without it).
export const continueAsGuest = () => set('auth', { in: false, guest: true });
export const startSignUp = () => set('auth', { in: false, guest: false });
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
// Deletes the account from this device for good (App Store rule 5.1.1(v): accounts must be deletable in the app).
export function deleteAccount() { set('account', {}); set('auth', { in: false, guest: false }); }
