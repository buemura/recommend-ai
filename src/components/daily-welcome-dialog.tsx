"use client";

import { useEffect, useState } from "react";

interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
}

export function DailyWelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastShown = localStorage.getItem("daily-welcome-shown");

    if (lastShown === today) return;

    fetch("/api/recomendacao/rate-limit")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: RateLimitInfo) => {
        setRateLimit(data);
        setOpen(true);
        localStorage.setItem("daily-welcome-shown", today);
      })
      .catch(() => {});
  }, []);

  if (!open || !rateLimit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="neo-card-static mx-4 w-full max-w-sm bg-white p-6 text-center animate-pop-in">
        <div className="mb-3 text-5xl">🎟️</div>

        <h2 className="font-display text-2xl text-black">Bom dia!</h2>

        <p className="mt-2 text-sm font-medium text-black/60">
          Suas recomendações de hoje
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="neo-card-static bg-brutal-green px-4 py-3 text-center">
            <div className="font-display text-3xl text-black">
              {rateLimit.remaining}
            </div>
            <div className="text-xs font-bold text-black/70">disponíveis</div>
          </div>

          <div className="text-2xl font-bold text-black/30">/</div>

          <div className="neo-card-static bg-brutal-cream px-4 py-3 text-center">
            <div className="font-display text-3xl text-black">
              {rateLimit.limit}
            </div>
            <div className="text-xs font-bold text-black/70">total</div>
          </div>
        </div>

        {rateLimit.used > 0 && (
          <p className="mt-3 text-xs font-medium text-black/50">
            Você já usou {rateLimit.used} hoje
          </p>
        )}

        {rateLimit.remaining === 0 && (
          <p className="mt-3 text-sm font-bold text-brutal-red">
            Você atingiu o limite de hoje! Volte amanhã 😊
          </p>
        )}

        <button
          onClick={() => setOpen(false)}
          className="neo-btn bg-brutal-yellow mt-5 w-full"
        >
          Bora! 🚀
        </button>
      </div>
    </div>
  );
}
