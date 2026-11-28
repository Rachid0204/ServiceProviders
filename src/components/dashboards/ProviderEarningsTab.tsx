import { uiText, interpolateCopy } from '../../i18n/uiCopy';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, OperationType, reportFirestoreError } from '../../firebase';
import {
  buildWithdrawalRequestId,
  computeProviderEarningsBreakdown,
  formatMadCurrency,
  type BookingRecord,
  type LanguageCode,
  type VettedProvider,
} from '../../utils/marketplace';
import type { SystemSettingsRecord } from '../../utils/adminMetrics';
import { isVerifiedAuthUser, mapProfileSaveError } from '../../utils/authHelpers';
import { ProviderCodEarningsView } from './ProviderCodEarningsView';

interface ProviderWithdrawalItem {
  id: string;
  bankName: string;
  ribMasked: string;
  amountMad: number;
  status: 'pending' | 'approved' | 'completed' | 'frozen' | 'rejected';
  adminNote?: string;
  createdAtIso: string;
}

const MOROCCAN_BANKS = [
  'CIH Bank',
  'Attijariwafa Bank',
  'Banque Populaire',
  'Bank of Africa (BMCE)',
  'Société Générale Maroc',
  'Crédit Agricole du Maroc',
  'Al Barid Bank',
  'CFG Bank',
];

function formatWithdrawalDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().slice(0, 10);
}

interface ProviderEarningsTabProps {
  lang: LanguageCode;
  firebaseUser: User;
  ownProvider: VettedProvider;
  providerBookings: BookingRecord[];
  systemSettings: SystemSettingsRecord;
}

export const ProviderEarningsTab: React.FC<ProviderEarningsTabProps> = ({
  lang,
  firebaseUser,
  ownProvider,
  providerBookings,
  systemSettings,
}) => {
  const isAr = lang === 'ar';
  const [withdrawals, setWithdrawals] = useState<ProviderWithdrawalItem[]>([]);
  const [bankName, setBankName] = useState(MOROCCAN_BANKS[0]);
  const [ribInput, setRibInput] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(
    Math.max(100, systemSettings.minWithdrawalMad)
  );
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [withdrawalNotice, setWithdrawalNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isVerifiedAuthUser(firebaseUser)) {
      setWithdrawals([]);
      return;
    }
    const q = query(
      collection(db, 'withdrawals'),
      where('providerId', '==', firebaseUser.uid),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: ProviderWithdrawalItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              bankName: String(data.bankName || ''),
              ribMasked: String(data.ribMasked || ''),
              amountMad: Number(data.amountMad || 0),
              status: (data.status as ProviderWithdrawalItem['status']) || 'pending',
              adminNote: data.adminNote ? String(data.adminNote) : undefined,
              createdAtIso: formatWithdrawalDate(data.createdAt),
            };
          })
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        setWithdrawals(items);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'withdrawals');
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const earnings = useMemo(
    () =>
      computeProviderEarningsBreakdown({
        bookings: providerBookings,
        withdrawals,
        platformFeePct: systemSettings.platformFeePct,
        minWithdrawalMad: systemSettings.minWithdrawalMad,
        cmiEscrowEnabled: systemSettings.cmiEscrowEnabled,
      }),
    [
      providerBookings,
      withdrawals,
      systemSettings.platformFeePct,
      systemSettings.minWithdrawalMad,
      systemSettings.cmiEscrowEnabled,
    ]
  );

  const withdrawnTotalMad = useMemo(
    () =>
      withdrawals
        .filter((w) => w.status === 'pending' || w.status === 'approved')
        .reduce((sum, w) => sum + w.amountMad, 0),
    [withdrawals]
  );

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalNotice(null);

    if (earnings.hasPendingWithdrawal) {
      setWithdrawalNotice({
        type: 'error',
        text: uiText(isAr).provider.uneDemandeDeVirementEstDeja,
      });
      return;
    }

    if (systemSettings.requireKycForEscrowPayout && !ownProvider.verifiedBadge) {
      setWithdrawalNotice({
        type: 'error',
        text: uiText(isAr).provider.laVerificationCinDeVotreProfil,
      });
      return;
    }

    const minAllowed = Math.max(100, systemSettings.minWithdrawalMad);
    const roundedAmount = Math.round(withdrawAmount);

    if (
      !earnings.canRequestWithdrawal ||
      earnings.platformHeldWithdrawableMad < minAllowed ||
      roundedAmount > earnings.platformHeldWithdrawableMad
    ) {
      setWithdrawalNotice({
        type: 'error',
        text: uiText(isAr).provider.lesPaiementsEnEspecesCodSont,
      });
      return;
    }

    if (Number.isNaN(roundedAmount) || roundedAmount < minAllowed || roundedAmount > 100000) {
      setWithdrawalNotice({
        type: 'error',
        text: interpolateCopy(uiText(isAr).provider.leMontantDuRetraitDoitEtre, { v0: minAllowed }),
      });
      return;
    }

    const cleanRib = ribInput.replace(/\s+/g, '');
    if (cleanRib.length < 6) {
      setWithdrawalNotice({
        type: 'error',
        text: uiText(isAr).provider.veuillezSaisirUnRibBancaireValide,
      });
      return;
    }

    const maskedRib =
      cleanRib.length > 10
        ? `${cleanRib.slice(0, 4)} •••• •••• ${cleanRib.slice(-4)}`
        : `•••• ${cleanRib.slice(-6)}`;

    const withdrawalId = buildWithdrawalRequestId(firebaseUser.uid);
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    const lockRef = doc(db, 'withdrawalLocks', firebaseUser.uid);
    const providerRef = doc(db, 'providers', firebaseUser.uid);

    setIsSubmittingWithdrawal(true);
    try {
      await runTransaction(db, async (tx) => {
        const [providerSnap, lockSnap] = await Promise.all([
          tx.get(providerRef),
          tx.get(lockRef),
        ]);

        const serverWithdrawableMad = providerSnap.exists()
          ? Number(providerSnap.data().withdrawableBalanceMad ?? 0)
          : 0;
        if (roundedAmount > serverWithdrawableMad || serverWithdrawableMad < minAllowed) {
          throw new Error(
            uiText(isAr).provider.soldeDisponibleDetenuParLaPlateforme
          );
        }

        if (lockSnap.exists()) {
          const prevWithdrawalId = String(lockSnap.data().activeWithdrawalId || '');
          if (prevWithdrawalId) {
            const prevSnap = await tx.get(doc(db, 'withdrawals', prevWithdrawalId));
            if (prevSnap.exists()) {
              const prevStatus = String(prevSnap.data().status || 'pending');
              if (
                prevStatus !== 'approved' &&
                prevStatus !== 'rejected' &&
                prevStatus !== 'completed'
              ) {
                throw new Error(
                  uiText(isAr).provider.uneDemandeDeVirementEstDeja
                );
              }
            }
          }
        }

        tx.set(withdrawalRef, {
          providerId: firebaseUser.uid,
          providerName: isAr ? ownProvider.fullNameAr : ownProvider.fullNameFr,
          city: ownProvider.location.city,
          bankName,
          ribMasked: maskedRib.slice(0, 40),
          amountMad: roundedAmount,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.set(lockRef, {
          providerId: firebaseUser.uid,
          activeWithdrawalId: withdrawalId,
          updatedAt: serverTimestamp(),
        });
      });
      setRibInput('');
      setWithdrawalNotice({
        type: 'success',
        text: uiText(isAr).provider.demandeDeRetraitRibEnvoyeeAvec,
      });
    } catch (err) {
      setWithdrawalNotice({
        type: 'error',
        text: mapProfileSaveError(err, lang),
      });
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  if (!systemSettings.cmiEscrowEnabled) {
    return (
      <ProviderCodEarningsView
        lang={lang}
        providerBookings={providerBookings}
        cashCollectedDirectlyMad={earnings.cashCollectedDirectlyMad}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>{uiText(isAr).provider.demanderUnVirementRib}</span>
          </h2>
          <p className="text-xs text-slate-600">
            {interpolateCopy(uiText(isAr).provider.montantMinimumDeRetrait, { v0: formatMadCurrency(Math.max(100, systemSettings.minWithdrawalMad), lang) })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="text-emerald-800">
              {uiText(isAr).provider.encaisseDirectEspecesCod}
            </div>
            <div className="text-base font-bold tabular-nums text-emerald-900 mt-0.5">
              {formatMadCurrency(earnings.cashCollectedDirectlyMad, lang)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-slate-700">
              {uiText(isAr).provider.soldePlateformeRetirable}
            </div>
            <div className="text-base font-bold tabular-nums text-slate-900 mt-0.5">
              {formatMadCurrency(earnings.platformHeldWithdrawableMad, lang)}
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          {uiText(isAr).provider.noteLesRevenusPayesEnEspeces}
        </div>

        {withdrawalNotice && (
          <div
            role={withdrawalNotice.type === 'error' ? 'alert' : 'status'}
            className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              withdrawalNotice.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            {withdrawalNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{withdrawalNotice.text}</span>
          </div>
        )}

        <form onSubmit={handleRequestWithdrawal} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {uiText(isAr).provider.banqueMarocaine}
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {MOROCCAN_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {uiText(isAr).provider.numeroRib24Chiffres}
            </label>
            <input
              type="text"
              dir="ltr"
              value={ribInput}
              onChange={(e) => setRibInput(e.target.value)}
              placeholder="230 780 00000000000000 99"
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {uiText(isAr).provider.montantSouhaiteDh}
            </label>
            <input
              type="number"
              min={Math.max(100, systemSettings.minWithdrawalMad)}
              max={100000}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingWithdrawal || !earnings.canRequestWithdrawal}
            className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmittingWithdrawal
              ? uiText(isAr).provider.envoiEnCours
              : uiText(isAr).provider.soumettreLaDemandeDeVirement}
          </button>
        </form>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {uiText(isAr).provider.historiqueDeMesRetraits}
          </h2>
          <span className="text-xs font-semibold text-slate-600 tabular-nums">
            {uiText(isAr).provider.totalDemande} {formatMadCurrency(withdrawnTotalMad, lang)}
          </span>
        </div>

        {withdrawals.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            {uiText(isAr).provider.aucuneDemandeDeVirementEnregistreePour}
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">
                    {w.bankName}{' '}
                    <span className="font-mono-tabular font-normal text-slate-500" dir="ltr">
                      ({w.ribMasked})
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono-tabular">{w.createdAtIso}</div>
                  {w.adminNote && <div className="text-slate-600 italic">{w.adminNote}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-slate-900">
                    {formatMadCurrency(w.amountMad, lang)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      w.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : w.status === 'rejected' || w.status === 'frozen'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {w.status === 'approved'
                      ? uiText(isAr).provider.valide
                      : w.status === 'rejected'
                      ? uiText(isAr).provider.refuse
                      : w.status === 'frozen'
                      ? uiText(isAr).provider.bloque
                      : uiText(isAr).provider.enAttente2}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
