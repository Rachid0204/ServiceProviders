import { formatMadCurrency, type BookingRecord, type LanguageCode } from './marketplace';

export type MoroccoPaymentGatewayId = 'cash_on_completion' | 'cmi_card' | 'bank_transfer';

export type PaymentRecordStatus =
  | 'pending_cod'
  | 'authorized'
  | 'captured'
  | 'settled_cod'
  | 'refunded'
  | 'failed';

export interface PaymentGatewayDescriptor {
  id: MoroccoPaymentGatewayId;
  enabledInProduction: boolean;
  requiresServerWebhook: boolean;
  labelFr: string;
  labelAr: string;
  descriptionFr: string;
  descriptionAr: string;
  badgeFr?: string;
  badgeAr?: string;
}

export interface InvoiceBreakdown {
  invoiceNumber: string;
  bookingRef: string;
  subtotalMad: number;
  platformFeePct: number;
  platformFeeMad: number;
  providerNetMad: number;
  currency: 'MAD';
}

/**
 * Modular Morocco payment gateway registry (Spec §11).
 * Cash on Completion is live at launch with 0% default commission.
 * Online CMI Card & Bank Transfer require verified server-side webhooks (never simulated in client Firestore).
 */
export const MOROCCO_PAYMENT_GATEWAYS: Record<MoroccoPaymentGatewayId, PaymentGatewayDescriptor> = {
  cash_on_completion: {
    id: 'cash_on_completion',
    enabledInProduction: true,
    requiresServerWebhook: false,
    labelFr: 'Paiement à la fin des travaux (Espèces / Virement direct)',
    labelAr: 'الدفع عند انتهاء الخدمة (نقداً أو تحويل مباشر)',
    descriptionFr:
      'Vous réglez directement le Maâlem après validation des travaux. 0% de frais plateforme au lancement.',
    descriptionAr:
      'تدفع للمعلم مباشرة بعد إتمام العمل والتحقق من جودته. 0% عمولة عند الإطلاق.',
    badgeFr: 'Actif · 0% frais',
    badgeAr: 'مفعل · 0% رسوم',
  },
  cmi_card: {
    id: 'cmi_card',
    enabledInProduction: false,
    requiresServerWebhook: true,
    labelFr: 'Carte Bancaire Marocaine (CMI)',
    labelAr: 'البطاقة البنكية المغربية (CMI)',
    descriptionFr:
      'Paiement en ligne sécurisé via passerelle CMI vérifiée côté serveur — activation prochaine.',
    descriptionAr: 'الدفع الإلكتروني المؤمن عبر بوابة CMI — سيتوفر قريباً.',
    badgeFr: 'Bientôt disponible',
    badgeAr: 'قريباً',
  },
  bank_transfer: {
    id: 'bank_transfer',
    enabledInProduction: false,
    requiresServerWebhook: true,
    labelFr: 'Virement bancaire vérifié',
    labelAr: 'تحويل بنكي موثق',
    descriptionFr: 'Règlement sur facture avec rapprochement bancaire automatique — bientôt disponible.',
    descriptionAr: 'أداء عبر فاتورة وتحويل بنكي موثق — سيتوفر قريباً.',
    badgeFr: 'Bientôt disponible',
    badgeAr: 'قريباً',
  },
};

export function getActivePaymentGateways(): PaymentGatewayDescriptor[] {
  return Object.values(MOROCCO_PAYMENT_GATEWAYS).filter((g) => g.enabledInProduction);
}

/**
 * Deterministic idempotency key for server-verified payment capture & refund callbacks.
 */
export function buildPaymentIdempotencyKey(
  bookingId: string,
  gateway: MoroccoPaymentGatewayId,
  action: 'capture' | 'refund' | 'cod_settle'
): string {
  const safeBooking = bookingId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return `pay_${safeBooking}_${gateway}_${action}`;
}

/**
 * Computes exact integer MAD invoice & receipt totals respecting configured platform commission
 * (defaults to 0% at launch so provider receives 100% of subtotalMad).
 */
export function computeInvoiceBreakdown(
  booking: Pick<BookingRecord, 'bookingRef' | 'estimatedMad' | 'platformFeeMad' | 'providerPayoutMad'>,
  platformFeePct = 0
): InvoiceBreakdown {
  const subtotalMad = Math.max(0, Math.round(booking.estimatedMad));
  const clampedPct = Math.max(0, Math.min(50, Math.round(platformFeePct)));
  const feeMad =
    typeof booking.platformFeeMad === 'number'
      ? Math.max(0, Math.min(subtotalMad, Math.round(booking.platformFeeMad)))
      : Math.round((subtotalMad * clampedPct) / 100);
  const providerNetMad =
    typeof booking.providerPayoutMad === 'number' &&
    booking.providerPayoutMad + feeMad === subtotalMad
      ? Math.round(booking.providerPayoutMad)
      : Math.max(0, subtotalMad - feeMad);

  return {
    invoiceNumber: `INV-${booking.bookingRef}`,
    bookingRef: booking.bookingRef,
    subtotalMad,
    platformFeePct: clampedPct,
    platformFeeMad: feeMad,
    providerNetMad,
    currency: 'MAD',
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a self-contained printable/downloadable HTML receipt for a booking (FR/AR + RTL safe).
 */
export function buildBookingReceiptHtml(
  booking: BookingRecord,
  lang: LanguageCode,
  platformFeePct = 0
): string {
  const isAr = lang === 'ar';
  const breakdown = computeInvoiceBreakdown(booking, platformFeePct);
  const dir = isAr ? 'rtl' : 'ltr';
  const paymentLabel =
    booking.paymentMethod === 'cash_on_completion'
      ? isAr
        ? 'الدفع عند انتهاء الخدمة (نقداً / تحويل مباشر)'
        : 'Paiement à la fin des travaux (Espèces / Virement direct)'
      : isAr
      ? 'ضمان CMI'
      : 'Séquestre CMI (historique)';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(breakdown.invoiceNumber)} — Moul L'Khedma</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 32px; line-height: 1.5; }
    .card { max-width: 720px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 28px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 20px; font-weight: 800; color: #047857; }
    .meta { font-size: 13px; color: #475569; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 13px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th, td { text-align: start; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 12px; text-transform: uppercase; color: #475569; }
    .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #0f172a; }
    .footer { margin-top: 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">${isAr ? 'مول الخدمة — Moul L’Khedma' : 'Moul L’Khedma — مول الخدمة'}</div>
        <div class="meta">${isAr ? 'وصل خدمة وفاتورة تدخل' : 'Reçu d’intervention & Récapitulatif'}</div>
      </div>
      <div class="meta">
        <div><strong>${escapeHtml(breakdown.invoiceNumber)}</strong></div>
        <div>${isAr ? 'التاريخ:' : 'Date :'} ${escapeHtml(booking.preferredDate)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div><strong>${isAr ? 'الزبون' : 'Client'}</strong></div>
        <div>${escapeHtml(booking.clientName)}</div>
        <div>${escapeHtml(booking.neighborhood)}, ${escapeHtml(booking.city)}</div>
      </div>
      <div class="box">
        <div><strong>${isAr ? 'المعلم / مقدم الخدمة' : 'Maâlem / Prestataire'}</strong></div>
        <div>${escapeHtml(booking.providerName)}</div>
        <div>${escapeHtml(booking.category)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${isAr ? 'الخدمة' : 'Prestation'}</th>
          <th>${isAr ? 'طريقة الدفع' : 'Mode de règlement'}</th>
          <th>${isAr ? 'المبلغ (د.م.)' : 'Montant (MAD)'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(booking.serviceType)} (#${escapeHtml(booking.bookingRef)})</td>
          <td>${escapeHtml(paymentLabel)}</td>
          <td>${escapeHtml(formatMadCurrency(breakdown.subtotalMad, lang))}</td>
        </tr>
        <tr>
          <td colspan="2">${isAr ? `رسوم المنصة (${breakdown.platformFeePct}%)` : `Frais de plateforme (${breakdown.platformFeePct}%)`}</td>
          <td>${escapeHtml(formatMadCurrency(breakdown.platformFeeMad, lang))}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">${isAr ? 'الصافي المستحق للمعلم' : 'Net prestataire'}</td>
          <td>${escapeHtml(formatMadCurrency(breakdown.providerNetMad, lang))}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      ${
        isAr
          ? 'مول الخدمة — المملكة المغربية · هذا الوصل يوثق تفاصيل الحجز المتفق عليها بين الزبون والمعلم.'
          : 'Moul L’Khedma — Maroc · Ce reçu récapitule les conditions d’intervention convenues entre le client et le Maâlem.'
      }
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers a clean browser download of the bilingual HTML receipt.
 */
export function downloadBookingReceipt(
  booking: BookingRecord,
  lang: LanguageCode,
  platformFeePct = 0
): void {
  const html = buildBookingReceiptHtml(booking, lang, platformFeePct);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `recu-${booking.bookingRef}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
