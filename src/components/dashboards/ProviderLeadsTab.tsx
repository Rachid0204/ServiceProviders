import { uiText, interpolateCopy } from '../../i18n/uiCopy';
import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Filter,
  MapPin,
  Search,
  Send,
  Zap,
} from 'lucide-react';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  computeQuotationTotals,
  filterJobPosts,
  formatMadCurrency,
  getDefaultQuoteValidUntilIso,
  validateJobProposalInput,
  type JobPostRecord,
  type JobProposalRecord,
  type JobUrgency,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SubmitProposalPayload } from '../../hooks/useJobPosts';
import { mapProfileSaveError } from '../../utils/authHelpers';
import { ProviderQuoteComposer } from './ProviderQuoteComposer';

interface ProviderLeadsTabProps {
  lang: LanguageCode;
  t: Translations;
  currentUid: string;
  ownProvider: VettedProvider;
  openJobPosts: JobPostRecord[];
  myProposalsByJobId: Record<string, JobProposalRecord>;
  onSubmitJobProposal: (job: JobPostRecord, payload: SubmitProposalPayload) => Promise<void>;
  onWithdrawJobProposal: (jobId: string) => Promise<void>;
}

export const ProviderLeadsTab: React.FC<ProviderLeadsTabProps> = ({
  lang,
  t,
  currentUid,
  ownProvider,
  openJobPosts,
  myProposalsByJobId,
  onSubmitJobProposal,
  onWithdrawJobProposal,
}) => {
  const isAr = lang === 'ar';

  const [jobSearch, setJobSearch] = useState('');
  const [jobCategoryFilter, setJobCategoryFilter] = useState<ServiceCategory | 'ALL'>('ALL');
  const [jobCityFilter, setJobCityFilter] = useState<MoroccanCity | 'ALL'>('ALL');
  const [jobQuartierFilter, setJobQuartierFilter] = useState('');
  const [jobUrgencyFilter, setJobUrgencyFilter] = useState<JobUrgency | 'ALL'>('ALL');
  const [jobMinBudget, setJobMinBudget] = useState<number>(0);

  const [quotingJobId, setQuotingJobId] = useState<string | null>(null);
  const [quoteLaborMad, setQuoteLaborMad] = useState<number>(200);
  const [quoteMaterialsMad, setQuoteMaterialsMad] = useState<number>(0);
  const [quoteValidUntil, setQuoteValidUntil] = useState<string>(() =>
    getDefaultQuoteValidUntilIso(7)
  );
  const [quoteWarranty, setQuoteWarranty] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [quoteSubmitError, setQuoteSubmitError] = useState<string | null>(null);
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  const availableClientJobs = useMemo(() => {
    const othersJobs = openJobPosts.filter((j) => j.clientId !== currentUid);
    return filterJobPosts(othersJobs, {
      category: jobCategoryFilter,
      city: jobCityFilter,
      quartier: jobQuartierFilter,
      urgency: jobUrgencyFilter,
      minBudgetMad: jobMinBudget > 0 ? jobMinBudget : undefined,
      searchQuery: jobSearch,
    });
  }, [
    currentUid,
    openJobPosts,
    jobCategoryFilter,
    jobCityFilter,
    jobQuartierFilter,
    jobUrgencyFilter,
    jobMinBudget,
    jobSearch,
  ]);

  const handleOpenQuoteComposer = (job: JobPostRecord, existing?: JobProposalRecord) => {
    setQuotingJobId(job.id);
    if (existing) {
      setQuoteLaborMad(
        typeof existing.laborCostMad === 'number'
          ? existing.laborCostMad
          : existing.proposedPriceMad
      );
      setQuoteMaterialsMad(
        typeof existing.materialsCostMad === 'number' ? existing.materialsCostMad : 0
      );
      setQuoteValidUntil(existing.validUntilIso || getDefaultQuoteValidUntilIso(7));
      setQuoteWarranty(
        existing.warrantyNote ||
          (uiText(isAr).provider.garantie30JoursMainDUvre)
      );
      setQuoteDuration(existing.estimatedDuration);
      setQuoteMessage(existing.message);
    } else {
      setQuoteLaborMad(job.budgetMad);
      setQuoteMaterialsMad(0);
      setQuoteValidUntil(getDefaultQuoteValidUntilIso(7));
      setQuoteWarranty(
        uiText(isAr).provider.garantie30JoursMainDUvre
      );
      setQuoteDuration(uiText(isAr).provider.disponibleSous24h2h);
      setQuoteMessage('');
    }
    setQuoteErrors({});
    setQuoteSubmitError(null);
  };

  const handleSendQuote = async (e: React.FormEvent, job: JobPostRecord) => {
    e.preventDefault();
    setQuoteSubmitError(null);
    const totals = computeQuotationTotals(quoteLaborMad, quoteMaterialsMad);
    const check = validateJobProposalInput(
      {
        proposedPriceMad: totals.totalMad,
        estimatedDuration: quoteDuration,
        message: quoteMessage,
      },
      lang
    );
    if (!check.valid) {
      setQuoteErrors(check.errors as Record<string, string>);
      return;
    }
    setQuoteErrors({});
    setIsSendingQuote(true);
    try {
      await onSubmitJobProposal(job, {
        proposedPriceMad: totals.totalMad,
        laborCostMad: totals.laborCostMad,
        materialsCostMad: totals.materialsCostMad,
        validUntilIso: quoteValidUntil || getDefaultQuoteValidUntilIso(7),
        warrantyNote: quoteWarranty.trim() || undefined,
        estimatedDuration: quoteDuration.trim(),
        message: quoteMessage.trim(),
      });
      setQuotingJobId(null);
      setQuoteMessage('');
    } catch (err) {
      setQuoteSubmitError(mapProfileSaveError(err, lang));
    } finally {
      setIsSendingQuote(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Job Board Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Filter className="w-4 h-4 text-emerald-700" />
            <span>
              {uiText(isAr).provider.filtrerLesBesoinsPubliesParLes}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setJobCategoryFilter((prev) =>
                  prev === ownProvider.category ? 'ALL' : ownProvider.category
                )
              }
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                jobCategoryFilter === ownProvider.category
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {interpolateCopy(uiText(isAr).provider.monMetier, { v0: t.categories[ownProvider.category] })}
            </button>
            <button
              type="button"
              onClick={() =>
                setJobCityFilter((prev) =>
                  prev === ownProvider.location.city ? 'ALL' : ownProvider.location.city
                )
              }
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                jobCityFilter === ownProvider.location.city
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {interpolateCopy(uiText(isAr).provider.maVille, { v0: t.cities[ownProvider.location.city] })}
            </button>
            <button
              type="button"
              onClick={() =>
                setJobUrgencyFilter((prev) => (prev === 'urgent' ? 'ALL' : 'urgent'))
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                jobUrgencyFilter === 'urgent'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{uiText(isAr).provider.urgent24h2}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
            <input
              type="search"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder={uiText(isAr).provider.motCleTitreRef}
              className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label={t.filterAllCategories}
              value={jobCategoryFilter}
              onChange={(e) => setJobCategoryFilter(e.target.value as ServiceCategory | 'ALL')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">{t.filterAllCategories}</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.categories[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label={t.filterAllCities}
              value={jobCityFilter}
              onChange={(e) => setJobCityFilter(e.target.value as MoroccanCity | 'ALL')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">{t.filterAllCities}</option>
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {t.cities[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <input
              type="text"
              value={jobQuartierFilter}
              onChange={(e) => setJobQuartierFilter(e.target.value)}
              placeholder={t.quartierFilterPlaceholder}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label={uiText(isAr).provider.urgence}
              value={jobUrgencyFilter}
              onChange={(e) => setJobUrgencyFilter(e.target.value as JobUrgency | 'ALL')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">{uiText(isAr).provider.toutesUrgences}</option>
              <option value="urgent">{uiText(isAr).provider.urgent24h}</option>
              <option value="this_week">{uiText(isAr).provider.cetteSemaine}</option>
              <option value="flexible">{uiText(isAr).provider.flexible}</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <input
              type="number"
              min={0}
              step={50}
              value={jobMinBudget || ''}
              onChange={(e) => setJobMinBudget(Number(e.target.value) || 0)}
              placeholder={uiText(isAr).provider.minDh}
              aria-label={uiText(isAr).provider.budgetMinimumDh}
              className="w-full px-2.5 py-2 text-xs font-mono-tabular bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
          <span>
            <strong className="text-slate-900 tabular-nums">{availableClientJobs.length}</strong>{' '}
            {uiText(isAr).provider.offreSClientOuverteSAux}
          </span>
          {(jobSearch ||
            jobCategoryFilter !== 'ALL' ||
            jobCityFilter !== 'ALL' ||
            jobQuartierFilter ||
            jobUrgencyFilter !== 'ALL' ||
            jobMinBudget > 0) && (
            <button
              type="button"
              onClick={() => {
                setJobSearch('');
                setJobCategoryFilter('ALL');
                setJobCityFilter('ALL');
                setJobQuartierFilter('');
                setJobUrgencyFilter('ALL');
                setJobMinBudget(0);
              }}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              {t.resetFilters}
            </button>
          )}
        </div>
      </div>

      {/* Open Job Cards List */}
      {availableClientJobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2.5">
          <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            {uiText(isAr).provider.aucuneOffreClientNeCorrespondA}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {uiText(isAr).provider.essayezDElargirVosFiltresToutes}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {availableClientJobs.map((job) => {
            const existingProposal = myProposalsByJobId[job.id];
            const isQuoting = quotingJobId === job.id;

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
                          <span>{uiText(isAr).provider.urgent24h2}</span>
                        </span>
                      )}
                      <span className="font-mono-tabular text-slate-400">#{job.jobRef}</span>
                    </div>
                    <span className="text-base font-bold tabular-nums text-emerald-700">
                      {formatMadCurrency(job.budgetMad, lang)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {t.cities[job.city]} · {job.neighborhood}
                        </span>
                      </span>
                      <span>·</span>
                      <span className="font-mono-tabular">
                        {job.preferredDate} ({job.preferredTimeSlot})
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{job.description}</p>

                  {job.problemPhotoUrl && (
                    <img
                      src={job.problemPhotoUrl}
                      alt={job.title}
                      className="w-full h-40 object-cover rounded-xl border border-slate-200"
                    />
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">
                      {uiText(isAr).provider.client}{' '}
                      <strong className="text-slate-900">{job.clientName.split(' ')[0]}</strong> ·{' '}
                      {job.proposalCount} {uiText(isAr).provider.devisDejaEnvoyes}
                    </span>

                    {existingProposal && existingProposal.status !== 'withdrawn' && !isQuoting ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {interpolateCopy(uiText(isAr).provider.devisEnvoye, { v0: formatMadCurrency(existingProposal.proposedPriceMad, lang) })}
                          </span>
                        </span>
                        {existingProposal.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenQuoteComposer(job, existingProposal)}
                              className="text-emerald-700 hover:underline font-medium cursor-pointer"
                            >
                              {uiText(isAr).provider.modifier}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void onWithdrawJobProposal(job.id);
                              }}
                              className="text-rose-700 hover:underline font-medium cursor-pointer"
                            >
                              {uiText(isAr).provider.retirer}
                            </button>
                          </>
                        )}
                      </div>
                    ) : !isQuoting ? (
                      <button
                        type="button"
                        onClick={() => handleOpenQuoteComposer(job, existingProposal)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {existingProposal?.status === 'withdrawn'
                            ? uiText(isAr).provider.modifierRenvoyerUnDevis
                            : uiText(isAr).provider.proposerUnDevis}
                        </span>
                      </button>
                    ) : null}
                  </div>

                  {isQuoting && (
                    <ProviderQuoteComposer
                      lang={lang}
                      t={t}
                      quoteLaborMad={quoteLaborMad}
                      setQuoteLaborMad={setQuoteLaborMad}
                      quoteMaterialsMad={quoteMaterialsMad}
                      setQuoteMaterialsMad={setQuoteMaterialsMad}
                      quoteValidUntil={quoteValidUntil}
                      setQuoteValidUntil={setQuoteValidUntil}
                      quoteWarranty={quoteWarranty}
                      setQuoteWarranty={setQuoteWarranty}
                      quoteDuration={quoteDuration}
                      setQuoteDuration={setQuoteDuration}
                      quoteMessage={quoteMessage}
                      setQuoteMessage={setQuoteMessage}
                      quoteErrors={quoteErrors}
                      quoteSubmitError={quoteSubmitError}
                      isSendingQuote={isSendingQuote}
                      onCancel={() => setQuotingJobId(null)}
                      onSubmit={(e) => {
                        void handleSendQuote(e, job);
                      }}
                    />
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
