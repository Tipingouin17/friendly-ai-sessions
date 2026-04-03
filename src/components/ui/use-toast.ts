/**
 * @file use-toast.ts
 * @description Re-export shim for the useToast hook and toast utility.
 * Provides a stable import path from the UI components directory.
 */

// Re-export the useToast hook from our implementation
import { useToast, toast, ToastContext } from "@/hooks/use-toast";

export { useToast, toast, ToastContext };
