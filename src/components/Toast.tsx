"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

export default function Toast({
  message,
  visible,
  onClose,
  type = "success",
}: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible && !show) return null;

  const bgColor =
    type === "success"
      ? "from-green-500 to-emerald-600"
      : type === "error"
        ? "from-red-500 to-rose-600"
        : "from-blue-500 to-indigo-600";

  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";

  return (
    <div
      className={`fixed top-6 left-1/2 z-[10000] -translate-x-1/2 transition-all duration-300 ${
        show
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`flex items-center gap-2 rounded-2xl bg-gradient-to-r ${bgColor} px-5 py-3 text-sm font-medium text-white shadow-xl`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
          {icon}
        </span>
        {message}
      </div>
    </div>
  );
}
