import React, { useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { interpolateCopy, uiText } from '../../i18n/uiCopy';
import type { LanguageCode, VettedProvider } from '../../utils/marketplace';
import { useProviderServices } from '../../hooks/useProviderServices';
import { useProviderAvailability } from '../../hooks/useProviderAvailability';
import { useProviderVerification } from '../../hooks/useProviderVerification';

export type ProviderActivationTabTarget = 'card' | 'services' | 'calendar' | 'verification';

interface ProviderActivationChecklistProps {
  uid: string | undefined;
  lang: LanguageCode;
  ownProvider: VettedProvider | null;
  onSelectTab: (tab: ProviderActivationTabTarget) => void;
}

export const ProviderActivationChecklist: React.FC<ProviderActivationChecklistProps> = ({
  uid,
  lang,
  ownProvider,
  onSelectTab,
}) => {
  const isAr = lang === 'ar';
  const { services } = useProviderServices(uid, lang);
  const { schedule } = useProviderAvailability(uid, lang);
  const { kycDoc } = useProviderVerification(uid, lang);

  const activeServiceCount = useMemo(
    () => services.filter((s) => s.isActive).length,
    [services]
  );

  const steps = useMemo(
    () => [
      {
        id: 'card' as const,
        done: Boolean(ownProvider),
        label: uiText(isAr).provider.activationStepCard,
      },
      {
        id: 'services' as const,
        done: activeServiceCount > 0,
        label: uiText(isAr).provider.activationStepServices,
      },
      {
        id: 'calendar' as const,
        done: Boolean(schedule.updatedAtIso),
        label: uiText(isAr).provider.activationStepAvailability,
      },
      {
        id: 'verification' as const,
        done: Boolean(ownProvider?.verifiedBadge || kycDoc),
        label: uiText(isAr).provider.activationStepKyc,
      },
    ],
    [ownProvider, activeServiceCount, schedule.updatedAtIso, kycDoc, isAr]
  );

  const completedCount = steps.filter((s) => s.done).length;
  if (completedCount >= steps.length) return null;

  return (
    <section className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-950">
            {uiText(isAr).provider.activationChecklistTitle}
          </h2>
          <p className="text-xs text-emerald-800 mt-0.5">
            {uiText(isAr).provider.activationChecklistSubtitle}
          </p>
        </div>
        <span className="text-xs font-bold tabular-nums text-emerald-900 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
          {interpolateCopy(uiText(isAr).provider.activationProgress, {
            v0: completedCount,
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectTab(step.id)}
            className={`p-3 rounded-xl border text-start flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              step.done
                ? 'bg-white border-emerald-200 text-emerald-900'
                : 'bg-white/80 border-slate-200 text-slate-800 hover:border-emerald-400'
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>{step.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
