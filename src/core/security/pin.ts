import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { LEGACY_V1_PIN_SALT_MARKER } from '@/core/database/migrations/legacy-v1';

const LEGACY_V1_SECURE_STORE_KEY = 'maobits_pos_pin_salt';
const PIN_PATTERN = /^\d{4}$/;

export async function newSalt(): Promise<string> {
  return Crypto.randomUUID().replace(/-/g, '');
}

async function digestPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}:MAOBITS-POS-v1`,
  );
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  if (!PIN_PATTERN.test(pin)) throw new Error('errors.pinFormat');
  return digestPin(pin, salt);
}

async function verifyLegacyV1Pin(pin: string, expected: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  const installSalt = await SecureStore.getItemAsync(LEGACY_V1_SECURE_STORE_KEY);
  if (!installSalt) return false;
  const actual = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${installSalt}:${pin}`,
  );
  return actual === expected;
}

export async function verifyPin(
  pin: string,
  salt: string,
  expected: string,
): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  if (salt === LEGACY_V1_PIN_SALT_MARKER) {
    return verifyLegacyV1Pin(pin, expected);
  }
  const actual = await digestPin(pin, salt);
  return actual === expected;
}
