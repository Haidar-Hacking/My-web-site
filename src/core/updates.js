// يتأكد من وجود إصدار جديد بصفحة Releases، وينزّل ملف الأندرويد وينصبه.
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { UPDATE_REPO } from './config';

export const currentVersion = () => Application.nativeApplicationVersion || (Constants.expoConfig && Constants.expoConfig.version) || '0.0.0';

export function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}

// Returns { version, notes, apk, page } when a newer version is published, otherwise null.
export async function checkForUpdate() {
  const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases?per_page=10`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) return null;
  const list = await res.json();
  const release = (Array.isArray(list) ? list : []).find((r) => !r.draft && /^v\d+\.\d+\.\d+$/.test(r.tag_name || ''));
  if (!release || !newer(release.tag_name, currentVersion())) return null;
  // On Android wait until the APK is attached, so the update can install from inside the app.
  if (Platform.OS === 'android' && !(release.assets || []).some((a) => a.name === 'GB-Browser.apk')) return null;
  const asset = (name) => ((release.assets || []).find((a) => a.name === name) || {}).browser_download_url || '';
  return { version: release.tag_name.replace(/^v/, ''), notes: release.body || '', apk: asset('GB-Browser.apk'), ipa: asset('GB-Browser.ipa'), page: release.html_url };
}

// Android: downloads the new APK with progress, then opens the system installer.
export async function downloadAndInstall(url, onProgress) {
  const file = new File(Paths.cache, 'GB-Browser-update.apk');
  if (file.exists) file.delete();
  const task = File.createDownloadTask(url, file, {
    onProgress: ({ bytesWritten, totalBytes }) => onProgress(totalBytes > 0 ? bytesWritten / totalBytes : -1),
  });
  const done = await task.downloadAsync();
  const apk = done && done.contentUri ? done : file;
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: apk.contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
}

export const canSelfInstall = Platform.OS === 'android';
