"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, visible, onClose, duration = 2500 }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 shadow-lg transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg">
        <Check className="h-3 w-3 text-success" />
      </div>
      <span className="text-sm text-text-primary">{message}</span>
      <button type="button" onClick={() => { setShow(false); setTimeout(onClose, 300); }} className="ml-2 text-text-muted hover:text-text-secondary transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
