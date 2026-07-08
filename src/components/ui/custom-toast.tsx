"use client";

import React from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, HelpCircle, X } from "lucide-react";

interface ToastCardProps {
  type: "success" | "error" | "info" | "confirm";
  message: string;
  toastId: string | number;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "success" | "primary";
}

export const ToastCard: React.FC<ToastCardProps> = ({
  type,
  message,
  toastId,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
}) => {
  const confirmBtnColors = {
    danger: "bg-rose-500 hover:bg-rose-600 text-white",
    success: "bg-emerald-500 hover:bg-emerald-600 text-slate-950",
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />;
      case "confirm":
        return <HelpCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="w-full max-w-sm p-4 bg-card border border-border rounded-2xl shadow-xl flex gap-3 font-sans text-foreground animate-fade-in">
      {getIcon()}
      <div className="flex-1 flex flex-col gap-2">
        <p className="text-xs font-semibold leading-relaxed">
          {message}
        </p>

        {type === "confirm" && (
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastId);
                if (onCancel) onCancel();
              }}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(toastId);
                if (onConfirm) await onConfirm();
              }}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${confirmBtnColors[confirmVariant]}`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>

      {type !== "confirm" && (
        <button
          onClick={() => toast.dismiss(toastId)}
          className="text-muted-foreground hover:text-foreground shrink-0 self-start p-0.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const customToast = {
  success: (message: string, options?: { duration?: number }) => {
    return toast.custom(
      (t) => <ToastCard type="success" message={message} toastId={t} />,
      { duration: options?.duration || 4000 }
    );
  },
  error: (message: string, options?: { duration?: number }) => {
    return toast.custom(
      (t) => <ToastCard type="error" message={message} toastId={t} />,
      { duration: options?.duration || 5000 }
    );
  },
  info: (message: string, options?: { duration?: number }) => {
    return toast.custom(
      (t) => <ToastCard type="info" message={message} toastId={t} />,
      { duration: options?.duration || 4000 }
    );
  },
  confirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      onCancel?: () => void;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: "danger" | "success" | "primary";
      duration?: number;
    }
  ) => {
    return toast.custom(
      (t) => (
        <ToastCard
          type="confirm"
          message={message}
          toastId={t}
          onConfirm={onConfirm}
          onCancel={options?.onCancel}
          confirmLabel={options?.confirmLabel}
          cancelLabel={options?.cancelLabel}
          confirmVariant={options?.variant || "danger"}
        />
      ),
      { duration: options?.duration || 8000 }
    );
  },
};
