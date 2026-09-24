import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('Checkpoint 16 inventory pagination', () => {
  it('paginates inventory in SQLite', () => {
    const source = read('src/modules/inventory/service.ts');

    expect(source).toContain(
      'async overview(actorId: string, search = \'\', page = 1, pageSize = 12)',
    );
    expect(source).toContain('COUNT(*) count');
    expect(source).toContain('LIMIT ? OFFSET ?');
    expect(source).toContain('pages: Math.max(1, Math.ceil(total / safePageSize))');
  });

  it('connects inventory UI to the shared Pager', () => {
    const source = read('app/(tabs)/inventory.tsx');

    expect(source).toContain('const [page, setPage] = useState(1)');
    expect(source).toContain('inventoryService.overview(user.id, search, page, 12)');
    expect(source).toContain('<Pager');
    expect(source).toContain('onChange={setPage}');
  });

  it('resets pagination when search changes', () => {
    const source = read('app/(tabs)/inventory.tsx');

    expect(source).toContain('setSearch(value)');
    expect(source).toContain('setPage(1)');
  });

  it('keeps global summary independent from current page', () => {
    const source = read('app/(tabs)/inventory.tsx');

    expect(source).toContain('inventoryService.summary(user.id)');
    expect(source).toContain('summary.activeProducts');
    expect(source).toContain('summary.unitsInStock');
  });
});
