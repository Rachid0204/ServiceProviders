import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  CalendarCheck,
  FileText,
  Star,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import type { NotificationRecord, NotificationPreferencesRecord } from '../../utils/marketplace';

function getNotificationIcon(type: NotificationRecord['type']) {
  switch (type) {
    case 'message_received':
      return <MessageSquare className="w-4 h-4 text-emerald-700" />;
    case 'booking_created':
    case 'booking_status':
      return <CalendarCheck className="w-4 h-4 text-sky-700" />;
    case 'quote_received':
    case 'quote_accepted':
    case 'quote_rejected':
      return <FileText className="w-4 h-4 text-amber-700" />;
    case 'review_received':
      return <Star className="w-4 h-4 text-amber-500" />;
    case 'kyc_updated':
      return <ShieldCheck className="w-4 h-4 text-emerald-700" />;
    default:
      return <Bell className="w-4 h-4 text-slate-600" />;
  }
}

function formatDateLabel(iso: string, isAr: boolean): string {
  try {
    return new Date(iso).toLocaleString(isAr ? 'ar-MA' : 'fr-MA', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export const NotificationsPage: React.FC = () => {
  const {
    t,
    isAr,
    notifications,
    unreadNotificationCount,
    notificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    saveNotificationPreferences,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [prefsDraft, setPrefsDraft] = useState<Omit<NotificationPreferencesRecord, 'uid'>>({
    inAppEnabled: notificationPreferences.inAppEnabled,
    emailEnabled: notificationPreferences.emailEnabled,
    smsWhatsAppEnabled: notificationPreferences.smsWhatsAppEnabled,
    bookingUpdates: notificationPreferences.bookingUpdates,
    quotationUpdates: notificationPreferences.quotationUpdates,
    chatMessages: notificationPreferences.chatMessages,
    marketingUpdates: notificationPreferences.marketingUpdates,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSavedBanner, setPrefsSavedBanner] = useState(false);

  useEffect(() => {
    setPrefsDraft({
      inAppEnabled: notificationPreferences.inAppEnabled,
      emailEnabled: notificationPreferences.emailEnabled,
      smsWhatsAppEnabled: notificationPreferences.smsWhatsAppEnabled,
      bookingUpdates: notificationPreferences.bookingUpdates,
      quotationUpdates: notificationPreferences.quotationUpdates,
      chatMessages: notificationPreferences.chatMessages,
      marketingUpdates: notificationPreferences.marketingUpdates,
    });
  }, [notificationPreferences]);

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleTogglePref = async (key: keyof Omit<NotificationPreferencesRecord, 'uid'>) => {
    const next = { ...prefsDraft, [key]: !prefsDraft[key] };
    setPrefsDraft(next);
    setSavingPrefs(true);
    setPrefsSavedBanner(false);
    try {
      await saveNotificationPreferences(next);
      setPrefsSavedBanner(true);
    } finally {
      setSavingPrefs(false);
    }
  };

  const preferenceItems: Array<{
    key: keyof Omit<NotificationPreferencesRecord, 'uid'>;
    labelFr: string;
    labelAr: string;
  }> = [
    { key: 'inAppEnabled', labelFr: 'Alertes dans l’application', labelAr: 'تنبيهات داخل التطبيق' },
    { key: 'emailEnabled', labelFr: 'Notifications par e-mail', labelAr: 'إشعارات البريد الإلكتروني' },
    { key: 'smsWhatsAppEnabled', labelFr: 'Rappels SMS / WhatsApp', labelAr: 'تذكيرات SMS / واتساب' },
    { key: 'bookingUpdates', labelFr: 'Mises à jour des réservations', labelAr: 'تحديثات الحجوزات' },
    { key: 'quotationUpdates', labelFr: 'Devis reçus et acceptations', labelAr: 'عروض الأثمنة والقبول' },
    { key: 'chatMessages', labelFr: 'Nouveaux messages instantanés', labelAr: 'الرسائل الفورية الجديدة' },
    { key: 'marketingUpdates', labelFr: 'Conseils & offres partenaires', labelAr: 'نصائح وعروض ترويجية' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.notificationsTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.notificationsSubtitle}</p>
        </div>

        {unreadNotificationCount > 0 && (
          <button
            type="button"
            onClick={() => {
              void markAllNotificationsRead();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{t.notificationsMarkAllRead}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Notifications Feed */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {t.notificationsTabAll} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {t.notificationsTabUnread} ({unreadNotificationCount})
            </button>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Bell className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">{t.notificationsEmpty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredNotifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`p-4 flex items-start gap-3.5 transition-colors ${
                    notif.isRead ? 'bg-white' : 'bg-emerald-50/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={notif.linkPath}
                      onClick={() => {
                        if (!notif.isRead) void markNotificationRead(notif.id);
                      }}
                      className="block group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {isAr ? notif.titleAr : notif.titleFr}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {isAr ? notif.bodyAr : notif.bodyFr}
                      </p>
                      <span className="inline-block text-[11px] text-slate-400 mt-1.5">
                        {formatDateLabel(notif.createdAtIso, isAr)}
                      </span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => {
                          void markNotificationRead(notif.id);
                        }}
                        aria-label={isAr ? 'تحديد كمقروء' : 'Marquer comme lu'}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void deleteNotification(notif.id);
                      }}
                      aria-label={isAr ? 'حذف الإشعار' : 'Supprimer la notification'}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Preferences Card */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-start gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.notificationsPreferencesTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {t.notificationsPreferencesSubtitle}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {preferenceItems.map((item) => {
              const checked = prefsDraft[item.key];
              return (
                <label
                  key={item.key}
                  className="py-3 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-xs font-medium text-slate-800">
                    {isAr ? item.labelAr : item.labelFr}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={savingPrefs}
                    onChange={() => {
                      void handleTogglePref(item.key);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>

          {prefsSavedBanner && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              {t.notificationsPrefSaved}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
