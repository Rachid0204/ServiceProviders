import { uiText, interpolateCopy } from '../../i18n/uiCopy';
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
  Download,
} from 'lucide-react';
import { appCheckStatus } from '../../firebase';
import { generateAuditLogsCsv } from '../../utils/bookingLogic';
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
            aria-label={uiText(isAr).admin.rechercherUnUtilisateur}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              uiText(isAr).admin.nom212VilleOuQuartier
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
                ? interpolateCopy(uiText(isAr).admin.tous, { v0: users.length })
                : r === 'client'
                ? uiText(isAr).admin.clients
                : r === 'provider'
                ? uiText(isAr).admin.maalems
                : uiText(isAr).admin.doubleRole}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.utilisateur}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.role}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.telephone}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.localisation}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.verificationCin}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                    {uiText(isAr).admin.aucunUtilisateurTrouve}
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
                              {uiText(isAr).admin.suspendu}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-400">{u.uid}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {u.role === 'both'
                          ? `${uiText(isAr).admin.clientMaalem}${
                              u.specialty && u.specialty !== 'none'
                                ? ` · ${t.categories[u.specialty]}`
                                : ''
                            }`
                          : u.role === 'provider'
                          ? `${uiText(isAr).common.maalem}${
                              u.specialty && u.specialty !== 'none'
                                ? ` · ${t.categories[u.specialty]}`
                                : ''
                            }`
                          : uiText(isAr).common.client}
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
                            <span>{uiText(isAr).admin.verifie}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">{uiText(isAr).admin.standard}</span>
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
                              ? uiText(isAr).admin.retirerBadge
                              : uiText(isAr).admin.verifierCin}
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
                                ? uiText(isAr).admin.reactiver
                                : uiText(isAr).admin.suspendre}
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
            aria-label={uiText(isAr).admin.rechercherUnAvis}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              uiText(isAr).admin.commentaireClientOuMaalem
            }
            className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <select
          aria-label={uiText(isAr).admin.filtrerParNote}
          value={minStars}
          onChange={(e) => setMinStars(Number(e.target.value))}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value={0}>
            {interpolateCopy(uiText(isAr).admin.toutesLesNotes, { v0: reviews.length })}
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
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.date}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.client}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.maalem}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.note2}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.commentaire}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.moderation}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                    {uiText(isAr).admin.aucunAvisClientAModerer}
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
                        aria-label={`${uiText(isAr).admin.supprimerAvis} ${r.authorName}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{uiText(isAr).common.supprimer}</span>
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
        return uiText(isAr).admin.enAttente;
      case 'approved':
        return uiText(isAr).admin.approuve;
      case 'frozen':
        return uiText(isAr).admin.geleKycLitige;
      case 'rejected':
        return uiText(isAr).admin.rejete;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">
            {uiText(isAr).admin.demandesDeRetraitVirementsBancairesRib}
          </h2>
        </div>
        <span className="text-xs font-mono-tabular text-slate-500">
          {withdrawals.length} {uiText(isAr).admin.demandes}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.refDate}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.maalemVille}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.banqueRib}</th>
              <th className="py-3 px-4 text-end">{uiText(isAr).admin.montantMad}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.statut}</th>
              <th className="py-3 px-4 text-end">{uiText(isAr).admin.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                  {uiText(isAr).admin.aucuneDemandeDeRetraitEnregistreePour}
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
                      <span>{uiText(isAr).admin.approuver}</span>
                    </button>
                    <button
                      type="button"
                      disabled={w.status === 'frozen'}
                      onClick={() => onUpdateWithdrawalStatus(w, 'frozen')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>{uiText(isAr).admin.geler}</span>
                    </button>
                    <button
                      type="button"
                      disabled={w.status === 'rejected'}
                      onClick={() => onUpdateWithdrawalStatus(w, 'rejected')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{uiText(isAr).admin.rejeter}</span>
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
  const [cmiEscrowEnabled, setCmiEscrowEnabled] = useState<boolean>(
    Boolean(settings.cmiEscrowEnabled)
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
    setCmiEscrowEnabled(Boolean(settings.cmiEscrowEnabled));
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
        cmiEscrowEnabled,
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
              {uiText(isAr).admin.parametresSystemeReglesSequestreCmi}
            </h2>
            <p className="text-xs text-slate-500">
              {interpolateCopy(uiText(isAr).admin.derniereMiseAJourPar, { v0: settings.updatedByEmail, v1: settings.updatedAtIso })}
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
              ? uiText(isAr).admin.firebaseAppCheckActifRecaptchaV3
              : appCheckStatus.siteKeyPresent
              ? uiText(isAr).admin.firebaseAppCheckCleRecaptchaDetectee
              : uiText(isAr).admin.firebaseAppCheckNonConfigureVite}
          </div>
          {!appCheckStatus.active && (
            <p className="text-[11px] opacity-90">
              {uiText(isAr).admin.pourProtegerFirestoreContreLeScraping}
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
              {uiText(isAr).admin.commissionPlateforme}
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
              {uiText(isAr).admin.seuilMinimumDeRetraitMad}
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
            {uiText(isAr).admin.numeroWhatsappSupport212}
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
              {uiText(isAr).admin.remboursementAutomatiqueCmi100EnCas}
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
              {uiText(isAr).admin.exigerLeBadgeCinVerifiePour}
            </span>
          </label>

          <div className="pt-2 border-t border-slate-100 space-y-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cmiEscrowEnabled}
                onChange={(e) => setCmiEscrowEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span className="font-semibold text-slate-900">
                {uiText(isAr).admin.cmiEscrowToggleLabel}
              </span>
            </label>
            <p className="text-[11px] text-slate-500 ps-6">
              {uiText(isAr).admin.cmiEscrowToggleHint}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {uiText(isAr).admin.enregistrerLesParametres}
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

  const handleExportAuditCsv = () => {
    const csv = generateAuditLogsCsv(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moul-lkhedma-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">
            {uiText(isAr).admin.journalDAuditAdministratifImmuableAdminlogs}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono-tabular text-slate-500">
            {logs.length} {uiText(isAr).admin.entrees}
          </span>
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={handleExportAuditCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{uiText(isAr).admin.exportAuditCsvBtn}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.horodatage}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.action2}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.cible}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.resume}</th>
              <th className="py-3 px-4 text-start">{uiText(isAr).admin.administrateur}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                  {uiText(isAr).admin.aucuneActionEnregistree}
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
