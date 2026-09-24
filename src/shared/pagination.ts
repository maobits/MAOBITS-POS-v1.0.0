import type { Page } from '@/core/types';
export function pageMeta<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
export function normalizePage(page: number, pageSize: number) { const p = Math.max(1, Math.floor(page)); const size = Math.max(1, Math.min(100, Math.floor(pageSize))); return { page: p, pageSize: size, offset: (p - 1) * size }; }

