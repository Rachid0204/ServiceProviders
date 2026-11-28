import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  BookingRecord,
  ProviderServiceItem,
  UserRole,
  VettedProvider,
} from '../../utils/marketplace';

export interface ModalsStateContextValue {
  authModalIntent: UserRole | null;
  setAuthModalIntent: (intent: UserRole | null) => void;
  isPostJobModalOpen: boolean;
  setIsPostJobModalOpen: (open: boolean) => void;
  bookingProvider: VettedProvider | null;
  bookingServiceItem: ProviderServiceItem | null;
  setBookingProvider: (p: VettedProvider | null) => void;
  openBookingModal: (provider: VettedProvider, service?: ProviderServiceItem | null) => void;
  detailBooking: BookingRecord | null;
  setDetailBooking: (b: BookingRecord | null) => void;
  cancellingBooking: BookingRecord | null;
  setCancellingBooking: (b: BookingRecord | null) => void;
  reschedulingBooking: BookingRecord | null;
  setReschedulingBooking: (b: BookingRecord | null) => void;
  reviewingBooking: BookingRecord | null;
  setReviewingBooking: (b: BookingRecord | null) => void;
}

export const ModalsStateContext = createContext<ModalsStateContextValue | null>(null);

export function useModalsState(): ModalsStateContextValue {
  const ctx = useContext(ModalsStateContext);
  if (!ctx) {
    throw new Error('useModalsState must be used inside ModalsStateProvider');
  }
  return ctx;
}

export const ModalsStateProvider: React.FC<{
  activeUserUid?: string | null;
  children: React.ReactNode;
}> = ({ activeUserUid, children }) => {
  const [authModalIntent, setAuthModalIntent] = useState<UserRole | null>(null);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [bookingProvider, setBookingProviderState] = useState<VettedProvider | null>(null);
  const [bookingServiceItem, setBookingServiceItem] = useState<ProviderServiceItem | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingRecord | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRecord | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRecord | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<BookingRecord | null>(null);

  const setBookingProvider = useCallback((p: VettedProvider | null) => {
    setBookingProviderState(p);
    if (!p) {
      setBookingServiceItem(null);
    }
  }, []);

  const openBookingModal = useCallback(
    (provider: VettedProvider, service: ProviderServiceItem | null = null) => {
      setBookingProviderState(provider);
      setBookingServiceItem(service);
    },
    []
  );

  // Wipe user-scoped modals on sign-out or account switch to prevent stale PII display
  useEffect(() => {
    setIsPostJobModalOpen(false);
    setBookingProviderState(null);
    setBookingServiceItem(null);
    setDetailBooking(null);
    setCancellingBooking(null);
    setReschedulingBooking(null);
    setReviewingBooking(null);
  }, [activeUserUid]);

  const value = useMemo<ModalsStateContextValue>(
    () => ({
      authModalIntent,
      setAuthModalIntent,
      isPostJobModalOpen,
      setIsPostJobModalOpen,
      bookingProvider,
      bookingServiceItem,
      setBookingProvider,
      openBookingModal,
      detailBooking,
      setDetailBooking,
      cancellingBooking,
      setCancellingBooking,
      reschedulingBooking,
      setReschedulingBooking,
      reviewingBooking,
      setReviewingBooking,
    }),
    [
      authModalIntent,
      isPostJobModalOpen,
      bookingProvider,
      bookingServiceItem,
      setBookingProvider,
      openBookingModal,
      detailBooking,
      cancellingBooking,
      reschedulingBooking,
      reviewingBooking,
    ]
  );

  return <ModalsStateContext.Provider value={value}>{children}</ModalsStateContext.Provider>;
};
