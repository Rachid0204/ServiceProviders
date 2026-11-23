import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Star,
  Trash2,
  History,
  Landmark,
  CheckCircle2,
  Snowflake,
  XCircle,
  Settings,
  Save,
} from 'lucide-react';
import { appCheckStatus } from '../../firebase';
import {
  formatMadCurrency,
  type LanguageCode,
  type UserProfileRecord,
  type UserRole,
} from '../../utils/marketplace';
import type {
  AdminAuditLog,
  AdminReviewItem,
  SystemSettingsRecord,
  WithdrawalRecord,
  WithdrawalStatus,
} from '../../utils/adminMetrics';
import type { Translations } from '../../i18n/translations';

interface AdminUsersSectionProps {
  lang: LanguageCode;
  t: Translations;
  users: UserProfileRecord[];
  onToggleUserVerified: (user: UserProfileRecord) => void;
  onToggleUserSuspension?: (user: UserProfileRecord) => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  lang,
  t,
  users,
  onToggleUserVerified,
  onToggleUserSuspension,
}) => {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (q) {
        const hay = [u.fullName, u.phone, u.city, u.neighborhood, u.specialty || '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
          <input
            type="search"
            aria-label={isAr ? 'بحث في المستخدمين...' : 'Rechercher un utilisateur...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isAr ? 'الاسم، الهاتف +212، المدينة أو الحي...' : 'Nom, +212, ville ou quartier...'
            }
            className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div
          role="group"
          aria-label="User Role Filter"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {(['ALL', 'client', 'provider', 'both'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                roleFilter === r
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === 'ALL'
                ? isAr
                  ? `الكل (${users.length})`
                  : `Tous (${users.length})`
                : r === 'client'
                ? isAr
                  ? 'الزبناء'
                  : 'Clients'
                : r === 'provider'
                ? isAr
                  ? 'المعلمون'
                  : 'Maâlems'
                : isAr
                ? 'مزدوج (Both)'
                : 'Double Rôle'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 text-start">{isAr ? 'المستخدم' : 'Utilisateur'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الدور' : 'Rôle'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الهاتف' : 'Téléphone'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'المدينة والحي' : 'Localisation'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'التوثيق' : 'Vérification CIN'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                    {isAr ? 'لا يوجد مستخدمون مطابقون.' : 'Aucun utilisateur trouvé.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSuspended = u.accountStatus === 'suspended';
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{u.fullName}</span>
                          {isSuspended && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">
                              {isAr ? 'معلق' : 'Suspendu'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-400">{u.uid}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {u.role === 'both'
                          ? `${isAr ? 'زبون ومعلم' : 'Client & Maâlem'}${
                              u.specialty && u.specialty !== 'none'
                                ? ` · ${t.categories[u.specialty]}`
                                : ''
                            }`
                          : u.role === 'provider'
                          ? `${isAr ? 'معلم' : 'Maâlem'}${
                              u.specialty && u.specialty !== 'none'
                                ? ` · ${t.categories[u.specialty]}`
                                : ''
                            }`
                          : isAr
                          ? 'زبون'
                          : 'Client'}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap" dir="ltr">
                        {u.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {t.cities[u.city]} · {u.neighborhood}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {u.verifiedBadge ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isAr ? 'موثق' : 'Vérifié'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">{isAr ? 'غير موثق' : 'Standard'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onToggleUserVerified(u)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            {u.verifiedBadge
                              ? isAr
                                ? 'إلغاء الشارة'
                                : 'Retirer badge'
                              : isAr
                              ? 'تفعيل التوثيق'
                              : 'Vérifier CIN'}
                          </button>
                          {onToggleUserSuspension && (
                            <button
                              type="button"
                              onClick={() => onToggleUserSuspension(u)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                isSuspended
                                  ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                              }`}
                            >
                              {isSuspended
                                ? isAr
                                  ? 'إعادة التفعيل'
                                  : 'Réactiver'
                                : isAr
                                ? 'تعليق'
                                : 'Suspendre'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface AdminReviewsSectionProps {
  lang: LanguageCode;
  t: Translations;
  reviews: AdminReviewItem[];
  onDeleteReview: (review: AdminReviewItem) => void;
}

export const AdminReviewsSection: React.FC<AdminReviewsSectionProps> = ({
  lang,
  t,
  reviews,
  onDeleteReview,
}) => {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState<string>('');
  const [minStars, setMinStars] = useState<number>(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (minStars > 0 && r.rating !== minStars) return false;
      if (q) {
        const hay = [
          r.authorName,
          r.providerNameFr,
          r.providerNameAr,
          r.commentFr,
          r.commentAr,
          r.quartier,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reviews, search, minStars]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
          <input
            type="search"
            aria-label={isAr ? 'بحث في التقييمات...' : 'Rechercher un avis...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isAr ? 'ابحث في نص التعليق، الزبون أو المعلم...' : 'Commentaire, client ou Maâlem...'
            }
            className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <select
          aria-label={isAr ? 'تصفية حسب النجوم' : 'Filtrer par note'}
          value={minStars}
          onChange={(e) => setMinStars(Number(e.target.value))}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value={0}>
            {isAr ? `جميع التقييمات (${reviews.length})` : `Toutes les notes (${reviews.length})`}
          </option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>
              {s} ★
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الزبون' : 'Client'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'المعلم' : 'Maâlem'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'النقطة' : 'Note'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'التعليق' : 'Commentaire'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'مراقبة' : 'Modération'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                    {isAr ? 'لا توجد تقييمات لعرضها.' : 'Aucun avis client à modérer.'}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={`${r.providerId}-${r.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.authorName}</div>
                      <div className="text-[11px] text-slate-500">{r.quartier}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {isAr ? r.providerNameAr : r.providerNameFr}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t.categories[r.category]} · {t.cities[r.city]}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {r.rating}/5
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      {isAr ? r.commentAr : r.commentFr}
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteReview(r)}
                        aria-label={`${isAr ? 'حذف تقييم' : 'Supprimer avis'} ${r.authorName}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حذف' : 'Supprimer'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface AdminWithdrawalsSectionProps {
  lang: LanguageCode;
  t: Translations;
  withdrawals: WithdrawalRecord[];
  onUpdateWithdrawalStatus: (
    withdrawal: WithdrawalRecord,
    nextStatus: WithdrawalStatus
  ) => void;
}

export const AdminWithdrawalsSection: React.FC<AdminWithdrawalsSectionProps> = ({
  lang,
  t,
  withdrawals,
  onUpdateWithdrawalStatus,
}) => {
  const isAr = lang === 'ar';

  const getStatusLabel = (st: WithdrawalStatus) => {
    switch (st) {
      case 'pending':
        return isAr ? 'قيد المراجعة' : 'En attente';
      case 'approved':
        return isAr ? 'تم التحويل' : 'Approuvé';
      case 'frozen':
        return isAr ? 'مجمد للمراقبة' : 'Gelé (KYC/Litige)';
      case 'rejected':
        return isAr ? 'مرفوض' : 'Rejeté';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">
            {isAr
              ? 'طلبات سحب الأرباح والتحويلات البنكية (RIB المغرب)'
              : 'Demandes de Retrait & Virements Bancaires (RIB Maroc)'}
          </h2>
        </div>
        <span className="text-xs font-mono-tabular text-slate-500">
          {withdrawals.length} {isAr ? 'طلبات' : 'demandes'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="py-3 px-4 text-start">{isAr ? 'المرجع والتاريخ' : 'Réf & Date'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'المعلم والمدينة' : 'Maâlem & Ville'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'البنك و RIB' : 'Banque & RIB'}</th>
              <th className="py-3 px-4 text-end">{isAr ? 'المبلغ (MAD)' : 'Montant (MAD)'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'الحالة' : 'Statut'}</th>
              <th className="py-3 px-4 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                  {isAr
                    ? 'لا توجد طلبات سحب مسجلة حالياً.'
                    : 'Aucune demande de retrait enregistrée pour le moment.'}
                </td>
              </tr>
            ) : (
              withdrawals.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-mono-tabular whitespace-nowrap">
                  <div className="font-bold text-slate-900">#{w.id.toUpperCase()}</div>
                  <div className="text-[11px] text-slate-500">{w.createdAtIso}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{w.providerName}</div>
                  <div className="text-[11px] text-slate-500">{t.cities[w.city]}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">{w.bankName}</div>
                  <div className="text-[11px] font-mono-tabular text-slate-500" dir="ltr">
                    {w.ribMasked}
                  </div>
                </td>
                <td className="py-3 px-4 text-end font-mono-tabular font-bold text-slate-900 whitespace-nowrap">
                  {formatMadCurrency(w.amountMad, lang)}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`font-semibold ${
                      w.status === 'approved'
                        ? 'text-emerald-700'
                        : w.status === 'frozen'
                        ? 'text-blue-700'
                        : w.status === 'rejected'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {getStatusLabel(w.status)}
                  </span>
                  {w.adminNote && (
                    <div className="text-[11px] text-slate-500 max-w-xs truncate">
                      {w.adminNote}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-end whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={w.status === 'approved'}
                      onClick={() => onUpdateWithdrawalStatus(w, 'approved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'موافقة' : 'Approuver'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={w.status === 'frozen'}
                      onClick={() => onUpdateWithdrawalStatus(w, 'frozen')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تجميد' : 'Geler'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={w.status === 'rejected'}
                      onClick={() => onUpdateWithdrawalStatus(w, 'rejected')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'رفض' : 'Rejeter'}</span>
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface AdminSettingsSectionProps {
  lang: LanguageCode;
  settings: SystemSettingsRecord;
  onSaveSettings: (patch: Partial<SystemSettingsRecord>) => Promise<void>;
}

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({
  lang,
  settings,
  onSaveSettings,
}) => {
  const isAr = lang === 'ar';
  const [platformFeePct, setPlatformFeePct] = useState<number>(settings.platformFeePct);
  const [minWithdrawalMad, setMinWithdrawalMad] = useState<number>(
    settings.minWithdrawalMad
  );
  const [autoRefundOnProviderCancel, setAutoRefundOnProviderCancel] = useState<boolean>(
    settings.autoRefundOnProviderCancel
  );
  const [requireKycForEscrowPayout, setRequireKycForEscrowPayout] = useState<boolean>(
    settings.requireKycForEscrowPayout
  );
  const [supportWhatsAppPhone, setSupportWhatsAppPhone] = useState<string>(
    settings.supportWhatsAppPhone
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  React.useEffect(() => {
    setPlatformFeePct(settings.platformFeePct);
    setMinWithdrawalMad(settings.minWithdrawalMad);
    setAutoRefundOnProviderCancel(settings.autoRefundOnProviderCancel);
    setRequireKycForEscrowPayout(settings.requireKycForEscrowPayout);
    setSupportWhatsAppPhone(settings.supportWhatsAppPhone);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        platformFeePct: Math.max(0, Math.min(30, Math.round(Number(platformFeePct)))),
        minWithdrawalMad: Math.max(50, Math.min(10000, Math.round(Number(minWithdrawalMad)))),
        autoRefundOnProviderCancel,
        requireKycForEscrowPayout,
        supportWhatsAppPhone: supportWhatsAppPhone.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isAr
                ? 'إعدادات النظام وقواعد الضمان المالي (CMI Escrow)'
                : 'Paramètres Système & Règles Séquestre CMI'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr
                ? `آخر تحديث بواسطة ${settings.updatedByEmail} (${settings.updatedAtIso})`
                : `Dernière mise à jour par ${settings.updatedByEmail} (${settings.updatedAtIso})`}
            </p>
          </div>
        </div>
      </div>

      {/* Firebase App Check Readiness Diagnostics (AUD-016 — read-only runtime status) */}
      <div
        data-testid="admin-app-check-status"
        className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
          appCheckStatus.active
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        {appCheckStatus.active ? (
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <div className="font-semibold">
            {appCheckStatus.active
              ? isAr
                ? 'Firebase App Check : مفعّل (reCAPTCHA v3)'
                : 'Firebase App Check : Actif (reCAPTCHA v3)'
              : appCheckStatus.siteKeyPresent
              ? isAr
                ? 'Firebase App Check : مفتاح reCAPTCHA موجود (في انتظار التهيئة)'
                : 'Firebase App Check : Clé reCAPTCHA détectée (initialisation en attente)'
              : isAr
              ? 'Firebase App Check : غير مهيأ في هذه البيئة'
              : 'Firebase App Check : Non configuré (VITE_FIREBASE_RECAPTCHA_SITE_KEY absente)'}
          </div>
          {!appCheckStatus.active && (
            <p className="text-[11px] opacity-90">
              {isAr
                ? 'لتفعيل الحماية ضد الاستخراج الآلي للبيانات، أضف المتغير VITE_FIREBASE_RECAPTCHA_SITE_KEY في إعدادات Vercel وفعّل App Check Enforcement في لوحة Firebase.'
                : 'Pour protéger Firestore contre le scraping automatisé, provisionnez VITE_FIREBASE_RECAPTCHA_SITE_KEY sur Vercel puis activez l’enforcement dans la console Firebase.'}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="setting-platform-fee"
              className="block font-semibold text-slate-700 mb-1"
            >
              {isAr ? 'نسبة عمولة المنصة (%)' : 'Commission Plateforme (%)'}
            </label>
            <input
              id="setting-platform-fee"
              type="number"
              min={0}
              max={30}
              value={platformFeePct}
              onChange={(e) => setPlatformFeePct(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="setting-min-withdrawal"
              className="block font-semibold text-slate-700 mb-1"
            >
              {isAr ? 'الحد الأدنى للسحب البنكي (MAD)' : 'Seuil minimum de retrait (MAD)'}
            </label>
            <input
              id="setting-min-withdrawal"
              type="number"
              min={50}
              max={10000}
              step={50}
              value={minWithdrawalMad}
              onChange={(e) => setMinWithdrawalMad(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="setting-support-phone"
            className="block font-semibold text-slate-700 mb-1"
          >
            {isAr ? 'رقم واتساب خدمة الزبناء (+212)' : 'Numéro WhatsApp Support (+212)'}
          </label>
          <input
            id="setting-support-phone"
            type="tel"
            dir="ltr"
            value={supportWhatsAppPhone}
            onChange={(e) => setSupportWhatsAppPhone(e.target.value)}
            className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-2.5 pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefundOnProviderCancel}
              onChange={(e) => setAutoRefundOnProviderCancel(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="font-medium text-slate-800">
              {isAr
                ? 'استرجاع تلقائي 100% لضمان CMI عند اعتذار أو إلغاء المعلم'
                : 'Remboursement automatique CMI (100%) en cas d’annulation par le Maâlem'}
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={requireKycForEscrowPayout}
              onChange={(e) => setRequireKycForEscrowPayout(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="font-medium text-slate-800">
              {isAr
                ? 'إلزامية توثيق البطاقة الوطنية (CIN) قبل تحويل أرباح الضمان'
                : 'Exiger le badge CIN vérifié pour débloquer les virements bancaires RIB'}
            </span>
          </label>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {isAr ? 'حفظ إعدادات النظام' : 'Enregistrer les paramètres'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

interface AdminAuditSectionProps {
  lang: LanguageCode;
  logs: AdminAuditLog[];
}

export const AdminAuditSection: React.FC<AdminAuditSectionProps> = ({ lang, logs }) => {
  const isAr = lang === 'ar';

  const getActionLabel = (action: AdminAuditLog['actionType']): string => {
    const map: Record<AdminAuditLog['actionType'], { fr: string; ar: string }> = {
      cin_approved: { fr: 'CIN Approuvée', ar: 'المصادقة على CIN' },
      cin_revoked: { fr: 'CIN Révoquée', ar: 'إلغاء توثيق CIN' },
      document_viewed: { fr: 'Accès Document CNDP', ar: 'معاينة وثيقة CNDP' },
      kyc_reviewed: { fr: 'Dossier KYC Traité', ar: 'معالجة ملف KYC' },
      dispute_resolved: { fr: 'Décision Litige', ar: 'قرار ملف نزاع' },
      report_moderated: { fr: 'Signalement Traité', ar: 'معالجة بلاغ' },
      user_suspended: { fr: 'Statut Compte', ar: 'تعليق / تفعيل حساب' },
      escrow_released: { fr: 'Séquestre CMI Libéré', ar: 'صرف ضمان CMI' },
      escrow_refunded: { fr: 'Séquestre Remboursé (100%)', ar: 'استرجاع ضمان CMI (100%)' },
      dispute_split: { fr: 'Arbitrage Litige (50/50)', ar: 'تسوية نزاع (50/50)' },
      booking_override: { fr: 'Statut Modifié', ar: 'تعديل حالة الحجز' },
      review_deleted: { fr: 'Avis Modéré', ar: 'حذف تقييم' },
      availability_toggled: { fr: 'Disponibilité', ar: 'تغيير التوفر' },
      withdrawal_updated: { fr: 'Retrait Bancaire', ar: 'تحديث طلب سحب' },
      settings_updated: { fr: 'Paramètres Système', ar: 'تحديث إعدادات النظام' },
    };
    return isAr ? map[action]?.ar || action : map[action]?.fr || action;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">
            {isAr
              ? 'سجل التدقيق غير القابل للتعديل (adminLogs)'
              : 'Journal d’audit administratif immuable (adminLogs)'}
          </h2>
        </div>
        <span className="text-xs font-mono-tabular text-slate-500">
          {logs.length} {isAr ? 'سجلات' : 'entrées'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="py-3 px-4 text-start">{isAr ? 'التاريخ والوقت' : 'Horodatage'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'نوع الإجراء' : 'Action'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'الهدف' : 'Cible'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'التفاصيل' : 'Résumé'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'المشرف' : 'Administrateur'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                  {isAr ? 'لا توجد عمليات مسجلة بعد.' : 'Aucune action enregistrée.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                    {log.createdAtIso}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {getActionLabel(log.actionType)}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                    {log.targetCollection}/{log.targetId}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{log.summary}</td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                    {log.adminEmail}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
