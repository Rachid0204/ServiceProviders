import { isValidMoroccanPhone, normalizeMoroccanPhone } from './marketplace';

export const DEFAULT_ADMIN_EMAIL_PLACEHOLDER = 'admin@moul-lkhedma.ma';

export interface SystemSettingsRecord {
  platformFeePct: number;
  minWithdrawalMad: number;
  autoRefundOnProviderCancel: boolean;
  requireKycForEscrowPayout: boolean;
  supportWhatsAppPhone: string;
  updatedByEmail: string;
  updatedAtIso: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsRecord = {
  platformFeePct: 0,
  minWithdrawalMad: 200,
  autoRefundOnProviderCancel: true,
  requireKycForEscrowPayout: true,
  supportWhatsAppPhone: '',
  updatedByEmail: DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
  updatedAtIso: '2026-11-18 09:00',
};

/**
 * Validates and normalizes an optional Moroccan support WhatsApp number.
 * Empty or whitespace-only values normalize to `''` (disabling WhatsApp support CTAs).
 * Non-empty values must normalize to strict `+212[5-7]XXXXXXXX` format.
 */
export function validateOptionalSupportWhatsAppPhone(raw: string): {
  valid: boolean;
  normalized: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  const normalized = normalizeMoroccanPhone(trimmed);
  if (!isValidMoroccanPhone(normalized)) {
    return { valid: false, normalized };
  }
  return { valid: true, normalized };
}
