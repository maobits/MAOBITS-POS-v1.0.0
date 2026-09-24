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

describe('Checkpoint 25 user avatars and horizontal login', () => {
  it('adds avatar storage to users', () => {
    const migration = read(
      'src/core/database/migrations/007_user_avatars.ts',
    );
    const service = read(
      'src/modules/users/service.ts',
    );

    expect(migration).toContain(
      'ADD COLUMN avatar_uri TEXT',
    );
    expect(service).toContain(
      'async setAvatar(',
    );
    expect(service).toContain(
      "persistLocalMedia(",
    );
    expect(service).toContain(
      "'users'",
    );
  });

  it('exposes avatar in auth choices and session', () => {
    const repository = read(
      'src/modules/auth/repository.ts',
    );
    const auth = read(
      'src/modules/auth/service.ts',
    );
    const types = read(
      'src/core/types.ts',
    );

    expect(repository).toContain(
      'u.avatar_uri',
    );
    expect(auth).toContain(
      'avatarUri: user.avatar_uri',
    );
    expect(types).toContain(
      'avatarUri: string | null',
    );
  });

  it('uses a horizontal scrollable user panel at login', () => {
    const login = read(
      'app/login.tsx',
    );

    expect(login).toContain(
      '<ScrollView',
    );
    expect(login).toContain(
      'horizontal',
    );
    expect(login).toContain(
      'showsHorizontalScrollIndicator',
    );
    expect(login).toContain(
      'uri={',
    );
    expect(login).toContain(
      'user.avatar_uri',
    );
  });

  it('lets administrators select and remove user avatars', () => {
    const users = read(
      'app/users.tsx',
    );

    expect(users).toContain(
      'launchImageLibraryAsync',
    );
    expect(users).toContain(
      'allowsEditing: true',
    );
    expect(users).toContain(
      'userService.setAvatar',
    );
    expect(users).toContain(
      'removeAvatarDraft',
    );
  });

  it('includes user avatars in backup and restore media mapping', () => {
    const backup = read(
      'src/core/backup/service.ts',
    );

    expect(backup).toContain(
      'tables.users',
    );
    expect(backup).toContain(
      'avatar_uri',
    );
    expect(backup).toContain(
      "table === 'users'",
    );
  });
});
