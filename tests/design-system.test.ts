import { describe, expect, it } from 'vitest';
import { tokens } from '@/core/theme/tokens';

describe('premium Expo design system', () => {
  it('keeps accessible touch targets', () => {
    expect(tokens.touchTarget).toBeGreaterThanOrEqual(44);
    expect(tokens.controlHeight).toBeGreaterThanOrEqual(tokens.touchTarget);
  });

  it('has semantic spacing and radius scales', () => {
    expect(tokens.spacing.xxxl).toBeGreaterThan(tokens.spacing.xs);
    expect(tokens.radius.xl).toBeGreaterThan(tokens.radius.xs);
  });
});
