import * as FileSystem from 'expo-file-system/legacy';
import { uid } from '@/shared/id';

const rootDir = `${FileSystem.documentDirectory}maobits-pos-media/`;

async function ensureDir(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export async function persistLocalMedia(
  sourceUri: string,
  kind: 'products' | 'suppliers' | 'users' | 'branding',
): Promise<string> {
  const dir = `${rootDir}${kind}/`;
  await ensureDir(dir);
  const ext = (sourceUri.split('.').pop() || 'jpg').split('?')[0] || 'jpg';
  const dest = `${dir}${uid('img')}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function removeLocalMedia(uri: string) {
  if (!uri.startsWith(rootDir)) return;
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function readBase64(uri: string) {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function writeBase64(relativeName: string, data: string) {
  await ensureDir(rootDir);
  const dest = `${rootDir}${relativeName.replace(/^\/+/, '')}`;
  const parent = dest.slice(0, dest.lastIndexOf('/') + 1);
  await ensureDir(parent);
  await FileSystem.writeAsStringAsync(dest, data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}

export function mediaRelativeName(uri: string) {
  return uri.startsWith(rootDir)
    ? uri.slice(rootDir.length)
    : `external/${uri.split('/').pop() || uid('media')}`;
}

export async function purgeLocalMedia() {
  for (const kind of ['products', 'suppliers'] as const) {
    const dir = `${rootDir}${kind}/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) await FileSystem.deleteAsync(dir, { idempotent: true });
  }
  await ensureDir(`${rootDir}branding/`);
}
