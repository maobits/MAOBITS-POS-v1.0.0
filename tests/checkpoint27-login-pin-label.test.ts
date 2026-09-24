import {
  describe,
  expect,
  it,
} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );
}

describe('Checkpoint 27 login PIN user label', () => {
  it('does not rely on unsupported i18n interpolation', () => {
    const login = read(
      'app/login.tsx',
    );

    expect(login).toContain(
      "t('premiumExtra.checkpoint25.pinForUser')",
    );
    expect(login).toContain(
      'selectedUser?.name',
    );
    expect(login).not.toContain(
      "name:\n                      selectedUser?.name",
    );
  });

  it('removes the literal name placeholder from locales', () => {
    const es = read(
      'src/core/i18n/locales/premium-extra.es.ts',
    );
    const en = read(
      'src/core/i18n/locales/premium-extra.en.ts',
    );

    expect(es).toContain(
      "pinForUser: 'PIN de'",
    );
    expect(en).toContain(
      "pinForUser: 'PIN for'",
    );
    expect(es).not.toContain(
      "pinForUser: 'PIN de {name}'",
    );
    expect(en).not.toContain(
      "pinForUser: 'PIN for {name}'",
    );
  });
});
