import * as Crypto from 'expo-crypto';
export const uid = (prefix: string) => `${prefix}_${Crypto.randomUUID()}`;
export const nowIso = () => new Date().toISOString();

