import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'celebration';

export interface GemReward {
  amount: number;
  isBonus?: boolean;
  partnerAmount?: number;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  gemReward?: GemReward;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, duration?: number, gemReward?: GemReward) => void;
  showSuccess: (message: string, duration?: number, gemReward?: GemReward) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showCelebration: (message: string, duration?: number, gemReward?: GemReward) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000, gemReward?: GemReward) => {
    const id = `toast-${++toastIdRef.current}`;
    const toast: ToastMessage = { id, type, message, duration, gemReward };
    
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [hideToast]);

  const showSuccess = useCallback((message: string, duration?: number, gemReward?: GemReward) => {
    showToast(message, 'success', duration, gemReward);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const showCelebration = useCallback((message: string, duration = 4000, gemReward?: GemReward) => {
    showToast(message, 'celebration', duration, gemReward);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{
      toasts,
      showToast,
      showSuccess,
      showError,
      showInfo,
      showCelebration,
      hideToast,
    }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
