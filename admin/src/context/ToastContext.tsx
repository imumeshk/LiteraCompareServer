import React, { createContext, useContext, useEffect, useState } from 'react';
import { ToastContainer, ToastItem, ToastType } from '../components/Toast';
import { toast, ToastManager } from '../api/client';

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>(() => ToastManager.getToasts());

  useEffect(() => {
    // Subscribe to global toast updates from ToastManager / API client
    const unsubscribe = ToastManager.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (
    message: string,
    type: ToastType = 'info',
    title?: string,
    duration?: number
  ) => {
    return ToastManager.show({ message, type, title, duration });
  };

  const dismissToast = (id: string) => {
    ToastManager.dismiss(id);
  };

  const clearAllToasts = () => {
    ToastManager.clearAll();
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to direct ToastManager if used outside provider
    return {
      toasts: ToastManager.getToasts(),
      showToast: (msg: string, type: ToastType = 'info', title?: string, duration?: number) =>
        ToastManager.show({ message: msg, type, title, duration }),
      dismissToast: (id: string) => ToastManager.dismiss(id),
      clearAllToasts: () => ToastManager.clearAll(),
      success: (msg: string, title?: string, duration?: number) => toast.success(msg, title, duration),
      error: (msg: string, title?: string, duration?: number) => toast.error(msg, title, duration),
      warning: (msg: string, title?: string, duration?: number) => toast.warning(msg, title, duration),
      info: (msg: string, title?: string, duration?: number) => toast.info(msg, title, duration),
    };
  }
  return {
    ...context,
    success: (msg: string, title?: string, duration?: number) => toast.success(msg, title, duration),
    error: (msg: string, title?: string, duration?: number) => toast.error(msg, title, duration),
    warning: (msg: string, title?: string, duration?: number) => toast.warning(msg, title, duration),
    info: (msg: string, title?: string, duration?: number) => toast.info(msg, title, duration),
  };
};
