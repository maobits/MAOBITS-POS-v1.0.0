export function ean13CheckDigit(first12: string): number { if (!/^\d{12}$/.test(first12))
    throw new Error('EAN-13 requires 12 digits'); const sum = [...first12].reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0); return (10 - (sum % 10)) % 10; }
export function makeEan13(first12: string): string { return first12 + ean13CheckDigit(first12); }
export function validateEan13(value: string): boolean { return /^\d{13}$/.test(value) && ean13CheckDigit(value.slice(0, 12)) === Number(value[12]); }
export function generateEan13(seed?: number): string { const base = String(seed ?? Date.now()).replace(/\D/g, '').slice(-11).padStart(11, '0'); return makeEan13(`7${base}`); }

