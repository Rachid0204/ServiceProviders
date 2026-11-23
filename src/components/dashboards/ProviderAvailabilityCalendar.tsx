import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Save,
} from 'lucide-react';
import {
  TIME_SLOTS,
  WEEKDAY_KEYS,
  getTodayIsoDate,
  type LanguageCode,
  type ProviderWeeklySchedule,
  type TimeSlot,
  type WeekdayKey,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import { useProviderAvailability } from '../../hooks/useProviderAvailability';

const WEEKDAY_LABELS: Record<WeekdayKey, { fr: string; ar: string }> = {
  mon: { fr: 'Lundi', ar: 'الاثنين' },
  tue: { fr: 'Mardi', ar: 'الثلاثاء' },
  wed: { fr: 'Mercredi', ar: 'الأربعاء' },
  thu: { fr: 'Jeudi', ar: 'الخميس' },
  fri: { fr: 'Vendredi', ar: 'الجمعة' },
  sat: { fr: 'Samedi', ar: 'السبت' },
  sun: { fr: 'Dimanche', ar: 'الأحد' },
};

interface ProviderAvailabilityCalendarProps {
  uid: string;
  lang: LanguageCode;
  t: Translations;
}

export const ProviderAvailabilityCalendar: React.FC<ProviderAvailabilityCalendarProps> = ({
  uid,
  lang,
  t,
}) => {
  const isAr = lang === 'ar';
  const { schedule, loading, saving, error, saveAvailability } = useProviderAvailability(
    uid,
    lang
  );

  const [draft, setDraft] = useState<ProviderWeeklySchedule>(schedule);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setDraft(schedule);
  }, [schedule]);

  const toggleDayEnabled = (day: WeekdayKey) => {
    setSavedNotice(null);
    setDraft((prev) => {
      const current = prev.days[day];
      const nextEnabled = !current.enabled;
      return {
        ...prev,
        days: {
          ...prev.days,
          [day]: {
            enabled: nextEnabled,
            slots:
              nextEnabled && current.slots.length === 0
                ? ['09:00 - 12:00', '14:00 - 17:00']
                : current.slots,
          },
        },
      };
    });
  };

  const toggleSlot = (day: WeekdayKey, slot: TimeSlot) => {
    setSavedNotice(null);
    setDraft((prev) => {
      const current = prev.days[day];
      const hasSlot = current.slots.includes(slot);
      const nextSlots = hasSlot
        ? current.slots.filter((s) => s !== slot)
        : [...current.slots, slot];
      return {
        ...prev,
        days: {
          ...prev.days,
          [day]: {
            enabled: nextSlots.length > 0,
            slots: nextSlots,
          },
        },
      };
    });
  };

  const addBlockedDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBlockedDate)) return;
    if (draft.blockedDates.includes(newBlockedDate)) {
      setNewBlockedDate('');
      return;
    }
    setSavedNotice(null);
    setDraft((prev) => ({
      ...prev,
      blockedDates: [...prev.blockedDates, newBlockedDate].sort().slice(0, 60),
    }));
    setNewBlockedDate('');
  };

  const removeBlockedDate = (dateIso: string) => {
    setSavedNotice(null);
    setDraft((prev) => ({
      ...prev,
      blockedDates: prev.blockedDates.filter((d) => d !== dateIso),
    }));
  };

  const handleSave = async () => {
    setSavedNotice(null);
    const ok = await saveAvailability(draft);
    if (ok) {
      setSavedNotice(
        isAr
          ? 'تم تحديث جدول المواعيد بنجاح!'
          : 'Vos horaires et disponibilités ont été enregistrés !'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>{t.availabilityTitle}</span>
            </h2>
            <p className="text-xs text-slate-600">
              {isAr
                ? 'حدد أيام وساعات عملك ليتمكن الزبناء من حجز مواعيد مناسبة بدون تضارب.'
                : 'Définissez vos jours d’intervention et créneaux horaires pour éviter les doublons de réservation.'}
            </p>
          </div>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => {
              void handleSave();
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving
                ? isAr
                  ? 'جاري الحفظ...'
                  : 'Enregistrement...'
                : isAr
                ? 'حفظ الجدول'
                : 'Enregistrer mon agenda'}
            </span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {savedNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Urgent Same-Day Toggle */}
        <label className="flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
          <div className="flex items-center gap-2.5 text-xs">
            <Zap className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <div className="font-bold text-slate-900">
                {isAr ? 'قبول التدخلات الاستعجالية في نفس اليوم' : 'Accepter les urgences le jour même'}
              </div>
              <div className="text-slate-600">
                {isAr
                  ? 'يظهر للزبناء أنك متاح للحالات المستعجلة.'
                  : 'Indique aux clients que vous répondez aux dépannages urgents sous 2h.'}
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={draft.acceptsUrgentSameDay}
            onChange={(e) => {
              setSavedNotice(null);
              setDraft((prev) => ({ ...prev, acceptsUrgentSameDay: e.target.checked }));
            }}
            className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />
        </label>

        {/* Weekly Schedule Grid */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {WEEKDAY_KEYS.map((day) => {
            const cfg = draft.days[day];
            return (
              <div
                key={day}
                className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-900 min-w-[120px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={() => toggleDayEnabled(day)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>{isAr ? WEEKDAY_LABELS[day].ar : WEEKDAY_LABELS[day].fr}</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const selected = cfg.enabled && cfg.slots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(day, slot)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span dir="ltr">{slot}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Blocked Dates / Vacations */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-900">
            {isAr ? 'أيام العطلة أو عدم التوفر الاستثنائية' : 'Dates bloquées / Congés exceptionnels'}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              min={getTodayIsoDate()}
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
            <button
              type="button"
              onClick={addBlockedDate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'حظر هذا التاريخ' : 'Bloquer cette date'}</span>
            </button>
          </div>
          {draft.blockedDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {draft.blockedDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800"
                >
                  <span dir="ltr">{d}</span>
                  <button
                    type="button"
                    onClick={() => removeBlockedDate(d)}
                    aria-label={`Remove ${d}`}
                    className="hover:text-rose-950 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
