import { uiText } from '../i18n/uiCopy';
import React from 'react';
import { CheckCircle2, Clock, Play, Star, XCircle, Circle } from 'lucide-react';
import type {
  BookingRecord,
  BookingStatus,
  JobPostRecord,
  LanguageCode,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

const ORDERED_STEPS: BookingStatus[] = [
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'reviewed',
];

function getStepLabel(status: BookingStatus, t: Translations): string {
  switch (status) {
    case 'pending':
      return t.statusPending;
    case 'accepted':
      return t.statusAccepted;
    case 'in_progress':
      return t.statusInProgress;
    case 'completed':
      return t.statusCompleted;
    case 'reviewed':
      return t.statusReviewed;
    case 'cancelled':
      return t.statusCancelled;
  }
}

export const BookingTimeline: React.FC<{
  booking: BookingRecord;
  lang: LanguageCode;
  t: Translations;
}> = ({ booking, lang, t }) => {
  const isAr = lang === 'ar';
  const currentIdx = ORDERED_STEPS.indexOf(booking.status);
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-900">{t.timelineTitle}</span>
        <span className="text-[11px] font-mono-tabular text-slate-500">
          {booking.createdAtIso}
        </span>
      </div>

      {isCancelled ? (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">{t.statusCancelled}</div>
            {booking.cancellationReason && <div>{booking.cancellationReason}</div>}
          </div>
        </div>
      ) : (
        <ol className="grid grid-cols-5 gap-1.5" aria-label={t.timelineTitle}>
          {ORDERED_STEPS.map((step, idx) => {
            const reached = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            const StepIcon =
              step === 'reviewed'
                ? Star
                : step === 'in_progress'
                ? Play
                : reached
                ? CheckCircle2
                : idx === currentIdx + 1
                ? Clock
                : Circle;

            return (
              <li
                key={step}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex flex-col items-center text-center gap-1"
              >
                <span
                  className={`w-7 h-7 rounded-full inline-flex items-center justify-center border ${
                    reached
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-400 border-slate-300'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    isCurrent
                      ? 'font-bold text-emerald-800'
                      : reached
                      ? 'font-medium text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {getStepLabel(step, t)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {!isCancelled && (
        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/70">
          <span>
            {uiText(isAr).booking.creeeLe} <strong>{booking.createdAtIso}</strong>
          </span>
          <span>
            {uiText(isAr).booking.intervention} <strong>{booking.preferredDate}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export const JobLifecycleStepper: React.FC<{
  job: JobPostRecord;
  lang: LanguageCode;
}> = ({ job, lang }) => {
  const isAr = lang === 'ar';
  if (job.status === 'cancelled' || job.status === 'closed') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
        <XCircle className="w-3.5 h-3.5" />
        <span>
          {job.status === 'cancelled'
            ? uiText(isAr).booking.annonceAnnulee
            : uiText(isAr).booking.annonceCloturee}
        </span>
      </div>
    );
  }

  const stage = job.status === 'assigned' ? 2 : job.proposalCount > 0 ? 1 : 0;
  const steps = isAr
    ? ['1. تم النشر', `2. عروض مستلمة (${job.proposalCount})`, '3. تم اختيار المعلم']
    : ['1. Publiée', `2. Devis reçus (${job.proposalCount})`, '3. Maâlem retenu'];

  return (
    <ol className="flex flex-wrap items-center gap-2 text-[11px]">
      {steps.map((label, idx) => {
        const done = idx <= stage;
        return (
          <li
            key={label}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
              done
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
          >
            {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
};
