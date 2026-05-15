/**
 * use toast
 *
 * Hook for the AIfacilitator application.
 */

import * as React from "react";
import {
  ToastActionElement,
  ToastProps
} from "@/components/ui/toast";

export interface ToastType {
  id: string;
  title?: string;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
}

type ToastFunction = (props: ToastProps) => string;
type Listener = (toasts: ToastType[]) => void;

let memoryState: ToastType[] = [];
const listeners: Listener[] = [];

const emit = () => {
  listeners.forEach((listener) => listener(memoryState));
};

export const dismiss = (toastId?: string) => {
  memoryState = toastId
    ? memoryState.filter((toastItem) => toastItem.id !== toastId)
    : [];
  emit();
};

export const toast: ToastFunction = ({ duration = 5000, ...props }) => {
  const id = Math.random().toString(36).substring(2, 9);
  const nextToast = { id, duration, ...props } as ToastType;

  memoryState = [...memoryState, nextToast];
  emit();

  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration);
  }

  return id;
};

// Custom hook for toast functionality backed by a shared global store.
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastType[]>(memoryState);

  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
};

// Create a global context for toast state.
export const ToastContext = React.createContext<ReturnType<typeof useToast> | null>(null);
