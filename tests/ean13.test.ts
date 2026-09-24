import { describe, expect, it } from 'vitest';
import { ean13CheckDigit, makeEan13, validateEan13 } from '@/core/barcode/ean13';
describe('EAN-13', () => { it('computes checksum', () => expect(ean13CheckDigit('770000000001')).toBe(9)); it('builds and validates', () => expect(validateEan13(makeEan13('770000000004'))).toBe(true)); it('rejects bad demo checksum', () => expect(validateEan13('7700000000047')).toBe(false)); });

