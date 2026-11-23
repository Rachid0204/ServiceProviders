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
