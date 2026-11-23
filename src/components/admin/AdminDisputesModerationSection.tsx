import { uiText } from '../../i18n/uiCopy';
import React, { useState } from 'react';
import {
  Scale,
  Flag,
  CheckCircle2,
  XCircle,
  FileWarning,
  Save,
} from 'lucide-react';
import type {
  DisputeRecord,
  DisputeStatus,
  LanguageCode,
} from '../../utils/marketplace';
import type { AdminModerationReportItem } from '../../utils/adminMetrics';

interface AdminDisputesModerationSectionProps {
  lang: LanguageCode;
  disputes: DisputeRecord[];
  reports: AdminModerationReportItem[];
  onUpdateDispute: (
    dispute: DisputeRecord,
    nextStatus: DisputeStatus,
    resolutionSummary: string
  ) => Promise<void>;
  onModerateReport: (
    report: AdminModerationReportItem,
    nextStatus: 'reviewed' | 'resolved' | 'dismissed'
  ) => Promise<void>;
}

const DISPUTE_STATUSES: DisputeStatus[] = [
  'open',
  'under_review',
  'waiting_for_client',
  'waiting_for_provider',
  'resolved',
  'closed',
];

export const AdminDisputesModerationSection: React.FC<AdminDisputesModerationSectionProps> = ({
  lang,
  disputes,
  reports,
  onUpdateDispute,
  onModerateReport,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'disputes' | 'reports'>('disputes');
  const [statusDraftById, setStatusDraftById] = useState<Record<string, DisputeStatus>>({});
  const [summaryDraftById, setSummaryDraftById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-5">
      {/* Workbench Mode Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('disputes')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            activeTab === 'disputes'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>
            {uiText(isAr).admin.litigesMediation} ({disputes.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>
            {uiText(isAr).admin.signalementsAvisChats} (
            {openReportsCount > 0 ? `${openReportsCount} ` : ''}
            {reports.length})
          </span>
        </button>
      </div>

      {activeTab === 'disputes' ? (
        disputes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
            {uiText(isAr).admin.aucunLitigeEnregistrePourLeMoment}
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const selectedStatus = statusDraftById[d.id] ?? d.status;
              const summaryText = summaryDraftById[d.id] ?? d.resolutionSummary ?? '';
              const isBusy = busyId === d.id;

              return (
                <div
                  key={d.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold text-slate-900">
                        #{d.bookingRef} · {d.reason}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({d.openedByRole})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{d.createdAtIso}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {d.description}
                  </p>

                  {d.evidenceUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {d.evidenceUrls.map((url, idx) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={`Preuve ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setStatusDraftById((prev) => ({
                          ...prev,
                          [d.id]: e.target.value as DisputeStatus,
                        }))
                      }
                      className="md:col-span-3 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {DISPUTE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={summaryText}
                      onChange={(e) =>
                        setSummaryDraftById((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                      placeholder={
                        uiText(isAr).admin.decisionDeMediationResume
                      }
                      className="md:col-span-6 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                    />

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyId(d.id);
                        try {
                          await onUpdateDispute(d, selectedStatus, summaryText);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="md:col-span-3 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{uiText(isAr).admin.enregistrerDecision}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
          {uiText(isAr).admin.aucunSignalementEnAttenteDeModeration}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={`${r.source}-${r.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                    {r.source === 'reviewReports'
                      ? uiText(isAr).admin.avis
                      : uiText(isAr).admin.conversation}
                  </span>
                  <span className="font-bold text-slate-900">{r.reason}</span>
                  <span className="text-[11px] font-mono text-slate-400">({r.status})</span>
                </div>
                <p className="text-xs text-slate-600">{r.details}</p>
                <div className="text-[11px] text-slate-400">
                  {r.targetId} · {r.createdAtIso}
                </div>
              </div>

              {r.status === 'open' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      void onModerateReport(r, 'reviewed');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{uiText(isAr).admin.traite}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onModerateReport(r, 'dismissed');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{uiText(isAr).admin.classerSansSuite}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
