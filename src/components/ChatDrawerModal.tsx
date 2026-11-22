import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Camera, MessageCircle, ShieldCheck, Image as ImageIcon } from 'lucide-react';
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
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  buildWhatsAppUrl,
  isSafeImageUrl,
  type BookingRecord,
  type ChatMessageRecord,
  type LanguageCode,
  type UserRole,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import { uploadMarketplacePhoto, revokePreviewObjectUrl } from '../utils/storageUpload';
import { isVerifiedAuthUser } from '../utils/authHelpers';

interface ChatDrawerModalProps {
  booking: BookingRecord;
  relatedBookings?: BookingRecord[];
  onSwitchBooking?: (booking: BookingRecord) => void;
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  activeRole: UserRole;
  activeUserName: string;
  readOnly?: boolean;
  localMessages: ChatMessageRecord[];
  onSendLocalMessage: (msg: ChatMessageRecord) => void;
  onClose: () => void;
}

function formatMessageTime(ts: unknown): string {
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
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const ChatDrawerModal: React.FC<ChatDrawerModalProps> = ({
  booking,
  relatedBookings = [],
  onSwitchBooking,
  lang,
  t,
  firebaseUser,
  activeRole,
  activeUserName,
  readOnly = false,
  localMessages,
  onSendLocalMessage,
  onClose,
}) => {
  const [text, setText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [firestoreMessages, setFirestoreMessages] = useState<ChatMessageRecord[]>([]);

  // Deduplication guard against rapid double-submit / Enter key spam
  const lastSentRef = useRef<{ bookingId: string; text: string; timestamp: number } | null>(null);

  const isLiveChat = Boolean(
    isVerifiedAuthUser(firebaseUser) && !booking.id.startsWith('booking-demo-')
  );

  useEffect(() => {
    return () => {
      revokePreviewObjectUrl(photoUrl);
    };
  }, [photoUrl]);

  // Real-time Firestore listener on `chats/{bookingId}/messages` when authenticated
  useEffect(() => {
    setFirestoreMessages([]);
    setUploadError(null);
    if (!isLiveChat) return;
    const messagesPath = `chats/${booking.id}/messages`;
    const q = query(
      collection(db, 'chats', booking.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ChatMessageRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            bookingId: String(data.bookingId || booking.id),
            clientId: String(data.clientId || booking.clientId),
            providerId: String(data.providerId || booking.providerId),
            senderId: String(data.senderId || ''),
            senderName: String(data.senderName || ''),
            senderRole: (data.senderRole as UserRole) || 'client',
            text: String(data.text || ''),
            photoUrl:
              typeof data.photoUrl === 'string' && isSafeImageUrl(data.photoUrl)
                ? data.photoUrl
                : undefined,
            createdAtIso: formatMessageTime(data.createdAt),
          };
        });
        setFirestoreMessages(loaded);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, messagesPath);
        setUploadError(
          lang === 'ar'
            ? 'تعذر تحميل رسائل المحادثة من Firestore.'
            : 'Impossible de charger les messages en temps réel.'
        );
      }
    );

    return () => unsubscribe();
  }, [isLiveChat, booking.id, booking.clientId, booking.providerId, lang]);

  const combinedMessages = isLiveChat ? firestoreMessages : localMessages;

  // Same client + provider conversation switcher keyed strictly by UIDs (never by name)
  const peerBookings = relatedBookings.filter(
    (b) => b.providerId === booking.providerId && b.clientId === booking.clientId
  );

  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploadingPhoto(true);
    try {
      const result = await uploadMarketplacePhoto({
        file,
        scope: 'chats',
        entityId: booking.id,
        userId: firebaseUser?.uid ?? null,
        lang,
      });
      setPhotoUrl((prev) => {
        revokePreviewObjectUrl(prev);
        return result.url;
      });
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر إرفاق الصورة.'
          : 'Impossible de téléverser la photo.'
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed && !photoUrl) return;

    const now = Date.now();
    if (
      !photoUrl &&
      lastSentRef.current &&
      lastSentRef.current.bookingId === booking.id &&
      lastSentRef.current.text === trimmed &&
      now - lastSentRef.current.timestamp < 1500
    ) {
      setText('');
      return;
    }
    lastSentRef.current = { bookingId: booking.id, text: trimmed, timestamp: now };

    const msgId = `msg-${now}-${Math.floor(Math.random() * 1000)}`;
    const safePhotoUrl = isSafeImageUrl(photoUrl) ? photoUrl : undefined;
    const effectiveSenderRole: 'client' | 'provider' =
      firebaseUser && booking.providerId === firebaseUser.uid
        ? 'provider'
        : firebaseUser && booking.clientId === firebaseUser.uid
        ? 'client'
        : activeRole === 'provider'
        ? 'provider'
        : 'client';

    const rawSenderName =
      activeUserName ||
      (effectiveSenderRole === 'provider' ? booking.providerName : booking.clientName);
    const safeSenderName =
      rawSenderName.trim().length >= 2 ? rawSenderName.trim().slice(0, 80) : 'Utilisateur';
    const messageText =
      trimmed || (lang === 'ar' ? '📷 صورة مرفقة من الموقع' : '📷 Photo du chantier jointe');

    if (isLiveChat && firebaseUser) {
      const path = `chats/${booking.id}/messages/${msgId}`;
      try {
        await setDoc(doc(db, 'chats', booking.id, 'messages', msgId), {
          bookingId: booking.id,
          clientId: booking.clientId,
          providerId: booking.providerId,
          senderId: firebaseUser.uid,
          senderName: safeSenderName,
          senderRole: effectiveSenderRole,
          text: messageText,
          ...(safePhotoUrl ? { photoUrl: safePhotoUrl } : {}),
          createdAt: serverTimestamp(),
        });
        setText('');
        setPhotoUrl('');
        setUploadError(null);
      } catch (err) {
        reportFirestoreError(err, OperationType.CREATE, path);
        setUploadError(
          lang === 'ar'
            ? 'تعذر إرسال الرسالة. تأكد من صلاحياتك في هذا الحجز.'
            : 'Impossible d’envoyer le message. Vérifiez votre accès à cette réservation.'
        );
      }
      return;
    }

    const newMsg: ChatMessageRecord = {
      id: msgId,
      bookingId: booking.id,
      clientId: booking.clientId,
      providerId: booking.providerId,
      senderId: effectiveSenderRole === 'provider' ? booking.providerId : booking.clientId,
      senderName: safeSenderName,
      senderRole: effectiveSenderRole,
      text: messageText,
      photoUrl: photoUrl || undefined,
      createdAtIso: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onSendLocalMessage(newMsg);
    setText('');
    setPhotoUrl('');
    setUploadError(null);
  };

  const whatsappUrl = buildWhatsAppUrl({
    phone: activeRole === 'client' ? booking.providerPhone : booking.clientPhone,
    lang,
    providerName: booking.providerName,
    category: t.categories[booking.category],
    bookingRef: booking.bookingRef,
    serviceType: booking.serviceType,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60"
    >
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl border-s border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="chat-drawer-title" className="text-base font-bold text-slate-900">
                {booking.providerName}
              </h2>
              <span className="text-xs font-mono-tabular text-emerald-700 font-semibold">
                #{booking.bookingRef}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {booking.serviceType} · {t.cities[booking.city]} ({booking.neighborhood})
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.chatDrawerSubtitle}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeBtn}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Request Conversation Switcher between Same Users */}
        {peerBookings.length > 1 && onSwitchBooking && (
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 font-medium whitespace-nowrap">
              {lang === 'ar' ? 'المحادثات المشتركة:' : 'Dossiers actifs :'}
            </span>
            {peerBookings.map((pb) => (
              <button
                key={pb.id}
                type="button"
                onClick={() => onSwitchBooking(pb)}
                className={`px-2.5 py-1 rounded-md font-mono-tabular font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  pb.id === booking.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                #{pb.bookingRef} ({pb.neighborhood})
              </button>
            ))}
          </div>
        )}

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {combinedMessages.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">{t.chatEmptyState}</div>
          ) : (
            combinedMessages.map((msg) => {
              const effectiveRole = activeRole === 'provider' ? 'provider' : 'client';
              const isMe = msg.senderRole === effectiveRole;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-xl p-3.5 text-xs space-y-2 ${
                      isMe
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] opacity-85">
                      <span className="font-semibold">
                        {msg.senderName} (
                        {msg.senderRole === 'provider' ? 'Maâlem' : 'Client'})
                      </span>
                      <span className="font-mono-tabular">{msg.createdAtIso}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.photoUrl && (
                      <img
                        src={msg.photoUrl}
                        alt="Pièce jointe"
                        className="rounded-lg max-h-40 w-auto object-cover border border-white/20 mt-1"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Upload Error Feedback */}
        {uploadError && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-700">
            {uploadError}
          </div>
        )}

        {/* Photo Attachment Preview */}
        {!readOnly && photoUrl && (
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <ImageIcon className="w-4 h-4" />
              <span>Photo prête à envoyer</span>
            </div>
            <button
              type="button"
              onClick={() => {
                revokePreviewObjectUrl(photoUrl);
                setPhotoUrl('');
              }}
              className="text-rose-700 font-semibold hover:underline cursor-pointer"
            >
              {t.removePhotoBtn}
            </button>
          </div>
        )}

        {/* Composer Footer (or Read-Only Admin Inspection Notice) */}
        {readOnly ? (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 text-center">
            {lang === 'ar'
              ? 'وضع القراءة فقط للإدارة (مراجعة المحادثة لحل النزاعات).'
              : 'Mode lecture seule administrateur (inspection du fil de discussion pour arbitrage).'}
          </div>
        ) : (
          <form
            onSubmit={handleSend}
            className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <label
              title={t.chatAttachPhotoBtn}
              aria-label={t.chatAttachPhotoBtn}
              className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingPhoto}
                onChange={handleChatPhotoUpload}
                className="hidden"
              />
            </label>
            <input
              type="text"
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.chatInputPlaceholder}
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={isUploadingPhoto}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t.chatSendBtn}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
