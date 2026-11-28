import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Plus,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { uiText, interpolateCopy } from '../../i18n/uiCopy';
import {
  buildWhatsAppUrl,
  formatMadCurrency,
  isQuotationExpired,
  type JobPostRecord,
  type JobProposalRecord,
  type LanguageCode,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import { useJobProposalsForClient } from '../../hooks/useJobPosts';
import { mapProfileSaveError } from '../../utils/authHelpers';
import { JobLifecycleStepper } from '../BookingTimeline';

interface JobProposalsPanelProps {
  job: JobPostRecord;
  lang: LanguageCode;
  t: Translations;
  expanded: boolean;
  onRejectProposal?: (jobId: string, providerId: string) => Promise<void>;
  onAcceptProposal: (job: JobPostRecord, proposal: JobProposalRecord) => Promise<string>;
  onAcceptedBooking: (bookingRef: string) => void;
}

const JobProposalsPanel: React.FC<JobProposalsPanelProps> = ({
  job,
  lang,
  t,
  expanded,
  onRejectProposal,
  onAcceptProposal,
  onAcceptedBooking,
}) => {
  const isAr = lang === 'ar';
  const { proposals, loading } = useJobProposalsForClient(job.id, expanded);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  if (!expanded) return null;

  const handleAccept = async (proposal: JobProposalRecord) => {
    setAcceptError(null);
    setAcceptingId(proposal.providerId);
    try {
      const bookingRef = await onAcceptProposal(job, proposal);
      onAcceptedBooking(bookingRef);
    } catch (err) {
      setAcceptError(mapProfileSaveError(err, lang));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (proposal: JobProposalRecord) => {
    if (!onRejectProposal) return;
    setAcceptError(null);
    setRejectingId(proposal.providerId);
    try {
      await onRejectProposal(job.id, proposal.providerId);
    } finally {
      setRejectingId(null);
    }
  };

  const activePendingQuotes = proposals.filter((p) => p.status === 'pending');
  const lowestPrice =
    activePendingQuotes.length > 1
      ? Math.min(...activePendingQuotes.map((p) => p.proposedPriceMad))
      : null;

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      {acceptError && (
        <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          {acceptError}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">
          {uiText(isAr).client.chargementDesDevisRecus}
        </p>
      ) : proposals.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">
          {uiText(isAr).client.aucunDevisRecuPourLeMoment}
        </p>
      ) : (
        <div className="space-y-3">
          {proposals.length >= 2 && (
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-[11px]">
              <div className="font-bold text-emerald-900">{t.quoteCompareTitle}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-200 text-slate-600">
                      <th className="py-1 pe-2 text-start font-semibold">{uiText(isAr).common.maalem}</th>
                      <th className="py-1 px-2 text-start font-semibold">{t.laborCostLabel}</th>
                      <th className="py-1 px-2 text-start font-semibold">{t.materialsCostLabel}</th>
                      <th className="py-1 px-2 text-start font-semibold">Total</th>
                      <th className="py-1 ps-2 text-start font-semibold">★</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {proposals.map((p) => (
                      <tr key={`cmp-${p.id}`}>
                        <td className="py-1.5 pe-2 font-semibold text-slate-900">
                          {p.providerName}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums text-slate-700">
                          {p.laborCostMad !== undefined
                            ? formatMadCurrency(p.laborCostMad, lang)
                            : '—'}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums text-slate-700">
                          {p.materialsCostMad !== undefined
                            ? formatMadCurrency(p.materialsCostMad, lang)
                            : '—'}
                        </td>
                        <td className="py-1.5 px-2 font-bold tabular-nums text-emerald-800">
                          {formatMadCurrency(p.proposedPriceMad, lang)}
                        </td>
                        <td className="py-1.5 ps-2 tabular-nums text-amber-700 font-semibold">
                          ★ {p.providerRating.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {proposals.map((prop) => {
            const expired = isQuotationExpired(prop.validUntilIso);
            const isBestPrice = lowestPrice !== null && prop.proposedPriceMad === lowestPrice;
            const waUrl = buildWhatsAppUrl({
              phone: prop.providerPhone,
              lang,
              providerName: prop.providerName,
              category: t.categories[job.category],
              bookingRef: job.jobRef,
              serviceType: job.title,
            });
            return (
              <div
                key={prop.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{prop.providerName}</span>
                    {prop.providerVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{t.verifiedCinLabel}</span>
                      </span>
                    )}
                    {isBestPrice && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-900">
                        {uiText(isAr).client.meilleurTarif}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700 tabular-nums">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{prop.providerRating.toFixed(1)}</span>
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-emerald-700">
                    {formatMadCurrency(prop.proposedPriceMad, lang)}
                  </span>
                </div>

                {(prop.laborCostMad !== undefined || prop.materialsCostMad !== undefined) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
                    <span>
                      {t.laborCostLabel}:{' '}
                      <strong className="tabular-nums">
                        {formatMadCurrency(prop.laborCostMad ?? 0, lang)}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      {t.materialsCostLabel}:{' '}
                      <strong className="tabular-nums">
                        {formatMadCurrency(prop.materialsCostMad ?? 0, lang)}
                      </strong>
                    </span>
                    {prop.validUntilIso && (
                      <>
                        <span>·</span>
                        <span className={expired ? 'text-rose-700 font-semibold' : ''}>
                          {expired
                            ? t.quoteExpiredBadge
                            : `${t.quoteValidUntilLabel} ${prop.validUntilIso}`}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-500">
                  {prop.estimatedDuration} · {t.cities[prop.providerCity]}
                  {prop.warrantyNote ? ` · ${prop.warrantyNote}` : ''}
                </div>
                <p className="text-slate-700 leading-relaxed">{prop.message}</p>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  {job.status === 'open' && prop.status === 'pending' && onRejectProposal && (
                    <button
                      type="button"
                      disabled={rejectingId === prop.providerId}
                      onClick={() => {
                        void handleReject(prop);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      {t.rejectQuoteBtn}
                    </button>
                  )}
                  {job.status === 'open' && prop.status === 'pending' && !expired && (
                    <button
                      type="button"
                      disabled={acceptingId === prop.providerId}
                      onClick={() => {
                        void handleAccept(prop);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {acceptingId === prop.providerId
                          ? uiText(isAr).client.confirmation
                          : uiText(isAr).client.accepterCeDevis}
                      </span>
                    </button>
                  )}
                  {prop.status === 'accepted' && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-semibold">
                      {uiText(isAr).client.devisAccepte}
                    </span>
                  )}
                  {prop.status === 'rejected' && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold">
                      {uiText(isAr).client.refuse}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ClientJobsTabProps {
  lang: LanguageCode;
  t: Translations;
  myClientJobPosts: JobPostRecord[];
  onOpenPostJob: () => void;
  onCancelJobPost: (jobId: string) => Promise<void>;
  onRejectProposal?: (jobId: string, providerId: string) => Promise<void>;
  onAcceptProposal: (job: JobPostRecord, proposal: JobProposalRecord) => Promise<string>;
  onAcceptedBooking: (bookingRef: string) => void;
}

export const ClientJobsTab: React.FC<ClientJobsTabProps> = ({
  lang,
  t,
  myClientJobPosts,
  onOpenPostJob,
  onCancelJobPost,
  onRejectProposal,
  onAcceptProposal,
  onAcceptedBooking,
}) => {
  const isAr = lang === 'ar';
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (myClientJobPosts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
          <Briefcase className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">
            {uiText(isAr).client.vousNAvezPasEncorePublie}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {uiText(isAr).client.publiezVotreBesoinGratuitementAvecVotre}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPostJob}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{uiText(isAr).client.publierMonPremierBesoin}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {myClientJobPosts.map((job) => {
        const isExpanded = expandedJobId === job.id;
        return (
          <div
            key={job.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-2xs"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {t.categories[job.category]}
                  </span>
                  {job.urgency === 'urgent' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <Zap className="w-3 h-3" />
                      <span>{uiText(isAr).client.urgent}</span>
                    </span>
                  )}
                  <span className="font-mono-tabular text-slate-400">#{job.jobRef}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    job.status === 'open'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : job.status === 'assigned'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {job.status === 'open'
                    ? uiText(isAr).client.ouvertAuxDevis
                    : job.status === 'assigned'
                    ? interpolateCopy(uiText(isAr).client.attribueA, {
                        v0: job.assignedProviderName || uiText(isAr).common.maalem,
                        v1: job.assignedProviderName || uiText(isAr).common.maalem,
                      })
                    : uiText(isAr).client.annule}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.cities[job.city]} ({job.neighborhood}) · {job.preferredDate} (
                  {job.preferredTimeSlot}) ·{' '}
                  <strong className="text-emerald-700 tabular-nums">
                    {formatMadCurrency(job.budgetMad, lang)}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{job.description}</p>
              <JobLifecycleStepper job={job} lang={lang} />
            </div>

            <div className="space-y-3">
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                >
                  <span>
                    {interpolateCopy(uiText(isAr).client.voirLesDevisRecus, {
                      v0: job.proposalCount,
                    })}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {job.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => {
                      void onCancelJobPost(job.id);
                    }}
                    className="text-xs font-medium text-rose-700 hover:underline cursor-pointer"
                  >
                    {uiText(isAr).client.annulerLAnnonce}
                  </button>
                )}
              </div>

              <JobProposalsPanel
                job={job}
                lang={lang}
                t={t}
                expanded={isExpanded}
                onRejectProposal={onRejectProposal}
                onAcceptProposal={onAcceptProposal}
                onAcceptedBooking={onAcceptedBooking}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
