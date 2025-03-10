
import { useState, useEffect } from "react";
import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  useToast as useToastPrimitive,
  ToastActionElement as ToastActionElementPrimitive,
} from "@radix-ui/react-toast";

export type ToastType = {
  id: string;
  title?: string;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
};

export const useToast = () => {
  const { toast } = useToastPrimitive();
  
  return {
    toast: (props: ToastProps) => {
      return toast({
        ...props,
        duration: props.duration ?? 5000,
      });
    },
    dismiss: (toastId?: string) => console.log("Dismiss toast", toastId),
  };
};

export const toast = (props: ToastProps) => {
  const { toast: toastFn } = useToast();
  return toastFn(props);
};
