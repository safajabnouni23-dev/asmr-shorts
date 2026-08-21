"use client";

import { useState } from "react";

interface OnboardingModalProps {
  onSelect: (gender: "male" | "female") => void;
}

export default function OnboardingModal({ onSelect }: OnboardingModalProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (gender: "male" | "female") => {
    setLoading(true);
    onSelect(gender);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 shadow-2xl border border-white/10">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <span className="text-3xl">🎧</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ASMR Shorts</h1>
          <p className="mt-2 text-sm text-gray-400">
            مرحباً بك! اختر جنسك لتخصيص المحتوى
          </p>
        </div>

        {/* Gender Selection */}
        <div className="space-y-3">
          <button
            onClick={() => handleSelect("male")}
            onMouseEnter={() => setHovered("male")}
            onMouseLeave={() => setHovered(null)}
            disabled={loading}
            className={`group flex w-full items-center gap-4 rounded-2xl border p-4 transition-all duration-300 ${
              hovered === "male"
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-white/10 bg-white/5"
            } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-2xl">
              👨
            </div>
            <div className="text-right flex-1">
              <p className="font-semibold text-white">ذكر</p>
              <p className="text-xs text-gray-400">Male</p>
            </div>
            <span className="text-gray-500 group-hover:text-blue-400 transition-colors">
              ←
            </span>
          </button>

          <button
            onClick={() => handleSelect("female")}
            onMouseEnter={() => setHovered("female")}
            onMouseLeave={() => setHovered(null)}
            disabled={loading}
            className={`group flex w-full items-center gap-4 rounded-2xl border p-4 transition-all duration-300 ${
              hovered === "female"
                ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20"
                : "border-white/10 bg-white/5"
            } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/20 text-2xl">
              👩
            </div>
            <div className="text-right flex-1">
              <p className="font-semibold text-white">أنثى</p>
              <p className="text-xs text-gray-400">Female</p>
            </div>
            <span className="text-gray-500 group-hover:text-pink-400 transition-colors">
              ←
            </span>
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="mt-2 text-xs text-gray-400">جاري التحميل...</p>
          </div>
        )}

        <p className="mt-6 text-center text-[10px] text-gray-600">
          نستخدم معرف الجهاز فقط — لا حاجة لكلمة مرور
        </p>
      </div>
    </div>
  );
}
