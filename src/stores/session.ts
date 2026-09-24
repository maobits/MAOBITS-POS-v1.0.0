import { create } from 'zustand';
import type { SessionUser } from '@/core/types';
interface SessionState {
    user: SessionUser | null;
    setUser(user: SessionUser | null): void;
    has(permission: string): boolean;
}
export const useSessionStore = create<SessionState>((set, get) => ({
    user: null,
    setUser: user => set({ user }),
    has: permission => Boolean(get().user?.permissions.includes(permission)),
}));

