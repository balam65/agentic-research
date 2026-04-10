"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ToastState {
  message: string;
  variant: "success" | "error";
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-soft",
            toast.variant === "success"
              ? "border-success bg-panel text-success"
              : "border-danger bg-panel text-danger",
          )}
        >
          {toast.variant === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
          ) : (
            <CircleAlert className="mt-0.5 h-5 w-5" />
          )}
          <p className="flex-1 text-sm font-medium text-ink">{toast.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={onDismiss}
            className="text-slate-500 transition hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
