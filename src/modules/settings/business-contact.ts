import { AppError } from '@/core/errors';
import { permissionService } from '@/modules/roles/service';
import { settingsRepository } from './repository';

export interface BusinessContact {
  email: string;
  phone: string;
}

const EMAIL_KEY = 'business_email';
const PHONE_KEY = 'business_phone';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ');
}

function validEmail(value: string) {
  return (
    !value ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function validPhone(value: string) {
  if (!value) return true;

  const digits = value.replace(/\D/g, '');

  return (
    value.startsWith('+') &&
    digits.length >= 8 &&
    digits.length <= 16
  );
}

export const businessContactService = {
  async get(): Promise<BusinessContact> {
    const [email, phone] = await Promise.all([
      settingsRepository.get(EMAIL_KEY),
      settingsRepository.get(PHONE_KEY),
    ]);

    return {
      email: email ?? '',
      phone: phone ?? '',
    };
  },

  async set(
    actorId: string,
    input: BusinessContact,
  ): Promise<BusinessContact> {
    await permissionService.require(
      actorId,
      'SETTINGS_MANAGE',
    );

    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    if (
      !validEmail(email) ||
      !validPhone(phone)
    ) {
      throw new AppError('errors.validation');
    }

    await settingsRepository.set(
      EMAIL_KEY,
      email,
    );
    await settingsRepository.set(
      PHONE_KEY,
      phone,
    );

    return { email, phone };
  },
};
