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

describe('Checkpoint 26 login safe area', () => {
  it('protects login content from the Android navigation area', () => {
    const login = read(
      'app/login.tsx',
    );

    expect(login).toContain(
      "from 'react-native-safe-area-context'",
    );
    expect(login).toContain(
      'useSafeAreaInsets()',
    );
    expect(login).toContain(
      "edges={['top', 'bottom']}",
    );
    expect(login).toContain(
      'paddingBottom: insets.bottom + 24',
    );
  });

  it('keeps the login content vertically scrollable on small screens', () => {
    const login = read(
      'app/login.tsx',
    );

    expect(login).toContain(
      'contentContainerStyle',
    );
    expect(login).toContain(
      'keyboardShouldPersistTaps="handled"',
    );
    expect(login).toContain(
      'showsVerticalScrollIndicator={false}',
    );
  });

  it('keeps the horizontal user selector from Checkpoint 25', () => {
    const login = read(
      'app/login.tsx',
    );

    expect(login).toContain(
      'horizontal',
    );
    expect(login).toContain(
      'user.avatar_uri',
    );
  });
});
