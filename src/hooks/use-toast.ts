
import * as React from "react";
import {
  Toast,
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

// Custom hook for toast functionality
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastType[]>([]);

  const toast = React.useCallback(({ ...props }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prevToasts) => [
      ...prevToasts,
      { id, ...props } as ToastType,
    ]);

    return id;
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    setToasts((prevToasts) => {
      if (toastId) {
        return prevToasts.filter((toast) => toast.id !== toastId);
      }
      return [];
    });
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
};

// For direct use without the hook
type ToastFunction = (props: ToastProps) => string;

// Create a global context for toast state
export const ToastContext = React.createContext<ReturnType<typeof useToast> | null>(null);

// Create a single instance of the toast function that can be imported directly
export const toast: ToastFunction = (props) => {
  // This is a simple implementation that will work without the context
  // The complete solution would use the context when available
  const id = Math.random().toString(36).substring(2, 9);
  console.log("Toast created:", props.title || "Notification");
  return id;
};
