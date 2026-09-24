import React from 'react';
import { useSessionStore } from '@/stores/session';
export function PermissionGate({ code, children }: {
    code: string;
    children: React.ReactNode;
}) { const has = useSessionStore(s => s.has(code)); return has ? <>{children}</> : null; }

