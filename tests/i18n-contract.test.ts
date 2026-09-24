import { describe, expect, it } from 'vitest';
import { es } from '@/core/i18n/locales/es';
import { en } from '@/core/i18n/locales/en';
import { premiumEs } from '@/core/i18n/locales/premium.es';
import { premiumEn } from '@/core/i18n/locales/premium.en';
import { premiumExtraEs } from '@/core/i18n/locales/premium-extra.es';
import { premiumExtraEn } from '@/core/i18n/locales/premium-extra.en';
import { PERMISSIONS } from '@/core/permissions/catalog';

function paths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe('i18n contracts', () => {
  it('keeps the core ES/EN key sets aligned', () => {
    expect(paths(es)).toEqual(paths(en));
  });

  it('keeps premium ES/EN copy aligned', () => {
    expect(paths(premiumEs)).toEqual(paths(premiumEn));
  });

  it('keeps premium extra ES/EN copy aligned', () => {
    expect(paths(premiumExtraEs)).toEqual(paths(premiumExtraEn));
  });

  it('covers every permission with human-readable ES/EN metadata', () => {
    const esLabels = premiumExtraEs.roles.permissionLabels as Record<string, string>;
    const enLabels = premiumExtraEn.roles.permissionLabels as Record<string, string>;
    const esDescriptions = premiumExtraEs.roles.permissionDescriptions as Record<string, string>;
    const enDescriptions = premiumExtraEn.roles.permissionDescriptions as Record<string, string>;

    for (const permission of PERMISSIONS) {
      expect(esLabels[permission]).toBeTruthy();
      expect(enLabels[permission]).toBeTruthy();
      expect(esDescriptions[permission]).toBeTruthy();
      expect(enDescriptions[permission]).toBeTruthy();
      expect(esLabels[permission]).not.toBe(permission);
      expect(enLabels[permission]).not.toBe(permission);
    }
  });

});
