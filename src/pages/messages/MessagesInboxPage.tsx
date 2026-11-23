import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Send,
  Camera,
  MessageCircle,
  ShieldAlert,
  Ban,
  CheckCheck,
  ArrowLeft,
  X,
  Image as ImageIcon,
  Calendar,
  MapPin,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../../firebase';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { buildMessageThreadPath, ROUTE_PATHS } from '../../app/routePaths';
import {
  buildWhatsAppUrl,
  isConversationUnreadForUser,
  isSafeImageUrl,
  type BookingRecord,
  type ChatMessageRecord,
  type UserRole,
} from '../../utils/marketplace';
import { uploadMarketplacePhoto, revokePreviewObjectUrl } from '../../utils/storageUpload';
import { dispatchUserNotification } from '../../hooks/useNotifications';

function formatTimestampShort(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // fallback
    }
  }
  return '';
}

function getStatusBadge(status: BookingRecord['status'], isAr: boolean) {
  switch (status) {
    case 'pending':
      return {
        label: isAr ? 'في الانتظار' : 'En attente',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'accepted':
      return {
        label: isAr ? 'مقبول' : 'Confirmée',
        cls: 'bg-sky-50 text-sky-800 border-sky-200',
      };
    case 'in_progress':
      return {
        label: isAr ? 'قيد الإنجاز' : 'En cours',
        cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    case 'completed':
    case 'reviewed':
      return {
        label: isAr ? 'مكتمل' : 'Terminée',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    default:
      return {
        label: isAr ? 'ملغى' : 'Annulée',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

export const MessagesInboxPage: React.FC = () => {
  const { bookingId: routeBookingId } = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();

  const {
    lang,
    t,
    isAr,
    firebaseUser,
    isVerified,
    userProfile,
    bookings,
    chatThreads,
    conversationsByBookingId,
    markConversationRead,
    updateConversationOnMessage,
    toggleBlockConversation,
    submitChatReport,
    sendLocalChatMessage,
  } = useMarketplace();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageLimit, setMessageLimit] = useState(50);
  const [firestoreMessages, setFirestoreMessages] = useState<ChatMessageRecord[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const [draftText, setDraftText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Comportement inapproprié');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUid = firebaseUser?.uid ?? '';

  // Sort conversations by latest message timestamp descending, then booking date
  const sortedBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...bookings]
      .filter((b) => {
        if (!q) return true;
        const counterparty = b.clientId === currentUid ? b.providerName : b.clientName;
        const meta = conversationsByBookingId[b.id];
        return [
          counterparty,
          b.serviceType,
          b.bookingRef,
          b.neighborhood,
          b.city,
          meta?.lastMessageText ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aMs = conversationsByBookingId[a.id]?.lastMessageAtMs ?? 0;
        const bMs = conversationsByBookingId[b.id]?.lastMessageAtMs ?? 0;
        if (bMs !== aMs) return bMs - aMs;
        return b.createdAtIso.localeCompare(a.createdAtIso);
      });
  }, [bookings, conversationsByBookingId, searchQuery, currentUid]);

  const selectedBooking = useMemo(() => {
    if (routeBookingId) {
      return bookings.find((b) => b.id === routeBookingId) ?? null;
    }
    return sortedBookings[0] ?? null;
  }, [routeBookingId, bookings, sortedBookings]);

  const selectedMeta = selectedBooking ? conversationsByBookingId[selectedBooking.id] : undefined;
  const isBlocked = Boolean(selectedMeta?.blockedByUid);
  const isBlockedByMe = Boolean(selectedMeta?.blockedByUid && selectedMeta.blockedByUid === currentUid);

  const isLiveThread = Boolean(
    selectedBooking &&
      firebaseUser &&
      isVerified &&
      !selectedBooking.id.startsWith('booking-demo-')
  );

  // Reset pagination & draft when switching conversations
  useEffect(() => {
    setMessageLimit(50);
    setThreadError(null);
    setReportFeedback(null);
  }, [selectedBooking?.id]);

  // Clean up ephemeral preview blob URLs
  useEffect(() => {
    return () => {
      revokePreviewObjectUrl(photoUrl);
    };
  }, [photoUrl]);

  // Real-time Firestore listener on `chats/{bookingId}/messages` (descending + reversed so latest always loads)
  useEffect(() => {
    setFirestoreMessages([]);
    setHasMoreMessages(false);
    if (!isLiveThread || !selectedBooking) return;

    const q = query(
      collection(db, 'chats', selectedBooking.id, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setHasMoreMessages(snapshot.docs.length >= messageLimit);
        const loaded: ChatMessageRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              bookingId: String(data.bookingId || selectedBooking.id),
              clientId: String(data.clientId || selectedBooking.clientId),
              providerId: String(data.providerId || selectedBooking.providerId),
              senderId: String(data.senderId || ''),
              senderName: String(data.senderName || ''),
              senderRole: (data.senderRole as UserRole) || 'client',
              text: String(data.text || ''),
              photoUrl:
                typeof data.photoUrl === 'string' && isSafeImageUrl(data.photoUrl)
                  ? data.photoUrl
                  : undefined,
              createdAtIso: formatTimestampShort(data.createdAt),
            };
          })
          .reverse();
        setFirestoreMessages(loaded);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, `chats/${selectedBooking.id}/messages`);
        setThreadError(
          isAr
            ? 'تعذر تحميل الرسائل في الوقت الفعلي.'
            : 'Impossible de charger les messages en temps réel.'
        );
      }
    );

    return () => unsubscribe();
  }, [isLiveThread, selectedBooking?.id, messageLimit, isAr]);

  // Mark conversation as read when opened or when new incoming message arrives
  useEffect(() => {
    if (!selectedBooking || !currentUid) return;
    if (isConversationUnreadForUser(selectedMeta, currentUid)) {
      void markConversationRead(selectedBooking);
    }
  }, [selectedBooking, selectedMeta, currentUid, markConversationRead]);

  const activeMessages = isLiveThread
    ? firestoreMessages
    : selectedBooking
    ? chatThreads[selectedBooking.id] || []
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeMessages.length, selectedBooking?.id]);

  const counterpartyReadLatest = useMemo(() => {
    if (!selectedBooking || !selectedMeta || !currentUid) return false;
    if (selectedMeta.lastSenderId !== currentUid || selectedMeta.lastMessageAtMs <= 0) return false;
    const counterpartyReadMs =
      currentUid === selectedBooking.clientId
        ? selectedMeta.providerLastReadAtMs ?? 0
        : selectedMeta.clientLastReadAtMs ?? 0;
    return counterpartyReadMs >= selectedMeta.lastMessageAtMs;
  }, [selectedBooking, selectedMeta, currentUid]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;
    setThreadError(null);
    setIsUploadingPhoto(true);
    try {
      const result = await uploadMarketplacePhoto({
        file,
        scope: 'chats',
        entityId: selectedBooking.id,
        userId: firebaseUser?.uid ?? null,
        lang,
      });
      setPhotoUrl((prev) => {
        revokePreviewObjectUrl(prev);
        return result.url;
      });
    } catch (err) {
      setThreadError(
        err instanceof Error
          ? err.message
          : isAr
          ? 'تعذر رفع الصورة.'
          : 'Impossible de téléverser la photo.'
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !firebaseUser || isBlocked || isSending) return;
    const trimmed = draftText.trim().slice(0, 500);
    if (!trimmed && !photoUrl) return;

    setIsSending(true);
    setThreadError(null);

    const now = Date.now();
    const msgId = `msg-${now}-${Math.floor(Math.random() * 1000)}`;
    const safePhotoUrl = isSafeImageUrl(photoUrl) ? photoUrl : undefined;
    const senderRole: 'client' | 'provider' =
      selectedBooking.providerId === firebaseUser.uid ? 'provider' : 'client';
    const senderName = (
      userProfile?.fullName ||
      firebaseUser.displayName ||
      (senderRole === 'provider' ? selectedBooking.providerName : selectedBooking.clientName)
    )
      .trim()
      .slice(0, 80);
    const finalText = trimmed || (isAr ? '📷 صورة مرفقة' : '📷 Photo jointe');

    try {
      if (isLiveThread) {
        await setDoc(doc(db, 'chats', selectedBooking.id, 'messages', msgId), {
          bookingId: selectedBooking.id,
          clientId: selectedBooking.clientId,
          providerId: selectedBooking.providerId,
          senderId: firebaseUser.uid,
          senderName: senderName.length >= 2 ? senderName : 'Utilisateur',
          senderRole,
          text: finalText,
          ...(safePhotoUrl ? { photoUrl: safePhotoUrl } : {}),
          createdAt: serverTimestamp(),
        });

        await updateConversationOnMessage(selectedBooking, finalText);

        const recipientUserId =
          firebaseUser.uid === selectedBooking.clientId
            ? selectedBooking.providerId
            : selectedBooking.clientId;
        void dispatchUserNotification({
          recipientUserId,
          actorUserId: firebaseUser.uid,
          type: 'message_received',
          titleFr: `Nouveau message de ${senderName}`,
          titleAr: `رسالة جديدة من ${senderName}`,
          bodyFr: finalText.slice(0, 140),
          bodyAr: finalText.slice(0, 140),
          linkPath: buildMessageThreadPath(selectedBooking.id),
        });
      } else {
        sendLocalChatMessage({
          id: msgId,
          bookingId: selectedBooking.id,
          clientId: selectedBooking.clientId,
          providerId: selectedBooking.providerId,
          senderId: firebaseUser.uid,
          senderName,
          senderRole,
          text: finalText,
          photoUrl: safePhotoUrl,
          createdAtIso: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setDraftText('');
      setPhotoUrl('');
    } catch (err) {
      reportFirestoreError(err, OperationType.CREATE, `chats/${selectedBooking.id}/messages/${msgId}`);
      setThreadError(
        isAr ? 'تعذر إرسال الرسالة. يرجى المحاولة مجدداً.' : 'Impossible d’envoyer le message.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || reportDetails.trim().length < 5) return;
    setIsSubmittingReport(true);
    try {
      await submitChatReport(selectedBooking, reportReason, reportDetails);
      setIsReportModalOpen(false);
      setReportDetails('');
      setReportFeedback(t.messagesReportSuccess);
    } catch {
      setThreadError(
        isAr
          ? 'يرجى إدخال تفاصيل كافية للإبلاغ (5 أحرف على الأقل).'
          : 'Veuillez préciser au moins 5 caractères pour votre signalement.'
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const selectedCounterpartyName = selectedBooking
    ? selectedBooking.clientId === currentUid
      ? selectedBooking.providerName
      : selectedBooking.clientName
    : '';

  const selectedCounterpartyPhone = selectedBooking
    ? selectedBooking.clientId === currentUid
      ? selectedBooking.providerPhone
      : selectedBooking.clientPhone
    : '';

  const whatsAppHref = selectedBooking
    ? buildWhatsAppUrl({
        phone: selectedCounterpartyPhone,
        lang,
        providerName: selectedCounterpartyName,
        category: selectedBooking.category,
        serviceType: selectedBooking.serviceType,
        bookingRef: selectedBooking.bookingRef,
      })
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.messagesInboxTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.messagesInboxSubtitle}</p>
        </div>
        <Link
          to={ROUTE_PATHS.NOTIFICATIONS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <span>{t.navNotifications}</span>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* Left Pane: Conversation List */}
        <aside
          className={`md:col-span-4 border-b md:border-b-0 md:border-e border-slate-200 flex flex-col bg-slate-50/50 ${
            routeBookingId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.messagesSearchPlaceholder}
                className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {sortedBookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 leading-relaxed">
                {t.messagesEmptyList}
              </div>
            ) : (
              sortedBookings.map((booking) => {
                const isSelected = selectedBooking?.id === booking.id;
                const counterparty =
                  booking.clientId === currentUid ? booking.providerName : booking.clientName;
                const meta = conversationsByBookingId[booking.id];
                const isUnread = isConversationUnreadForUser(meta, currentUid);
                const badge = getStatusBadge(booking.status, isAr);

                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => navigate(buildMessageThreadPath(booking.id))}
                    className={`w-full text-start px-4 py-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50/70' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {counterparty}
                          </span>
                          {isUnread && (
                            <span
                              aria-label={isAr ? 'غير مقروء' : 'Non lu'}
                              className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                          {booking.serviceType} · #{booking.bookingRef}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate mt-1.5 ${
                        isUnread ? 'font-semibold text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {meta?.lastMessageText || booking.description}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Message Thread */}
        <section
          className={`md:col-span-8 flex flex-col bg-white ${
            !routeBookingId && sortedBookings.length === 0 ? 'flex' : routeBookingId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!selectedBooking ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageCircle className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium">{t.messagesSelectConversation}</p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(ROUTE_PATHS.MESSAGES)}
                    aria-label={isAr ? 'رجوع' : 'Retour'}
                    className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {selectedCounterpartyName}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-500">
                        #{selectedBooking.bookingRef}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedBooking.neighborhood}, {selectedBooking.city}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {selectedBooking.preferredDate} · {selectedBooking.preferredTimeSlot}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {whatsAppHref && (
                    <a
                      href={whatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void toggleBlockConversation(selectedBooking);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                      isBlockedByMe
                        ? 'text-amber-900 bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isBlockedByMe ? t.messagesUnblockUserBtn : t.messagesBlockUserBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{t.messagesReportBtn}</span>
                  </button>
                </div>
              </div>

              {reportFeedback && (
                <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-medium text-emerald-800">
                  {reportFeedback}
                </div>
              )}

              {threadError && (
                <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs font-medium text-rose-700">
                  {threadError}
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 max-h-[460px]">
                {hasMoreMessages && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setMessageLimit((prev) => prev + 50)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 cursor-pointer"
                    >
                      {t.messagesLoadOlderBtn}
                    </button>
                  </div>
                )}

                {activeMessages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    {t.chatEmptyState}
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUid;
                    const isLastMessage = idx === activeMessages.length - 1;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs ${
                            isMine
                              ? 'bg-emerald-700 text-white rounded-be-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bs-xs'
                          }`}
                        >
                          {!isMine && (
                            <div className="text-[11px] font-semibold text-emerald-700 mb-0.5">
                              {msg.senderName}
                            </div>
                          )}
                          {msg.photoUrl && (
                            <a
                              href={msg.photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mb-2"
                            >
                              <img
                                src={msg.photoUrl}
                                alt={isAr ? 'صورة مرفقة' : 'Photo jointe'}
                                className="rounded-lg max-h-56 w-auto object-cover border border-black/10"
                              />
                            </a>
                          )}
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                          <span>{msg.createdAtIso}</span>
                          {isMine && isLastMessage && counterpartyReadLatest && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                              <CheckCheck className="w-3 h-3" />
                              {t.messagesReadReceipt}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              {isBlocked ? (
                <div className="p-4 border-t border-slate-200 bg-amber-50 text-xs text-amber-900 flex items-center justify-between gap-3">
                  <span>{t.messagesBlockedNotice}</span>
                  {isBlockedByMe && (
                    <button
                      type="button"
                      onClick={() => {
                        void toggleBlockConversation(selectedBooking);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer shrink-0"
                    >
                      {t.messagesUnblockUserBtn}
                    </button>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    void handleSendMessage(e);
                  }}
                  className="p-3 border-t border-slate-200 bg-white space-y-2"
                >
                  {photoUrl && (
                    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{isAr ? 'صورة جاهزة للإرسال' : 'Photo prête à être envoyée'}</span>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="text-emerald-700 hover:text-rose-700 cursor-pointer"
                        aria-label={t.removePhotoBtn}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label
                      className={`inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer shrink-0 ${
                        isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      title={t.chatAttachPhotoBtn}
                    >
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          void handlePhotoUpload(e);
                        }}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="text"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      maxLength={500}
                      placeholder={t.chatInputPlaceholder}
                      className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />

                    <button
                      type="submit"
                      disabled={isSending || isUploadingPhoto || (!draftText.trim() && !photoUrl)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.chatSendBtn}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      {/* Report Conversation Modal */}
      {isReportModalOpen && selectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">{t.messagesReportTitle}</h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                aria-label={t.closeBtn}
                className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                void handleReportSubmit(e);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.messagesReportReasonLabel}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Comportement inapproprié">
                    {isAr ? 'سلوك غير لائق' : 'Comportement inapproprié'}
                  </option>
                  <option value="Spam ou sollicitation">
                    {isAr ? 'رسائل مزعجة أو احتيال' : 'Spam ou tentative de fraude'}
                  </option>
                  <option value="Absence au rendez-vous">
                    {isAr ? 'عدم الالتزام بالموعد' : 'Absence ou non-respect du rendez-vous'}
                  </option>
                  <option value="Autre motif">
                    {isAr ? 'سبب آخر' : 'Autre motif'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.messagesReportDetailsLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={5}
                  maxLength={500}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  {t.closeBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || reportDetails.trim().length < 5}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {t.messagesReportSubmitBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
