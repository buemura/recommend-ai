"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import type { ActivityType } from "@/types";

interface RecommendationData {
  id: string;
  activityType: string;
  title: string;
  description: string;
  genre?: string;
  releaseYear?: number;
  rating?: number;
  seasons?: number;
  episodes?: number;
  artist?: string;
  language?: string;
  imageUrl?: string | null;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityType = searchParams.get("activityType") as ActivityType;

  const [recommendation, setRecommendation] =
    useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecommendation = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError("");

    const filters: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      if (key !== "activityType") {
        const num = Number(value);
        filters[key] = isNaN(num) ? value : num;
      }
    });

    try {
      const res = await fetch("/api/recomendacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType, filters }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = "Erro ao gerar recomendação.";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      setRecommendation(data.recommendation);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "Erro ao gerar recomendação."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [activityType, searchParams]);

  useEffect(() => {
    if (activityType) {
      fetchRecommendation();
    }
    // Fetch initial rate limit info
    fetch("/api/recomendacao/rate-limit")
      .then((res) => res.json())
      .then((data) => {
        if (data.remaining !== undefined) setRemaining(data.remaining);
      })
      .catch(() => {});
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const typeColors: Record<string, string> = {
    movie: "bg-brutal-yellow",
    tv_show: "bg-brutal-sky",
    anime: "bg-brutal-pink",
    music: "bg-brutal-green",
  };

  const typeEmojis: Record<string, string> = {
    movie: "🎬",
    tv_show: "📺",
    anime: "⛩️",
    music: "🎵",
  };

  const typeLabels: Record<string, string> = {
    movie: "Filme",
    tv_show: "Série",
    anime: "Anime",
    music: "Música",
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-slow mb-6 inline-block text-7xl">
            🎲
          </div>
          <h2 className="font-display text-2xl text-black">
            A IA está pensando...
          </h2>
          <p className="mt-2 font-medium text-black/50">
            Buscando a recomendação perfeita pra você
          </p>

          {/* Fun loading bars */}
          <div className="mx-auto mt-6 max-w-xs space-y-2">
            {["bg-brutal-yellow", "bg-brutal-pink", "bg-brutal-sky"].map(
              (color, i) => (
                <div
                  key={i}
                  className={`h-3 rounded-full border-2 border-black ${color}`}
                  style={{
                    animation: `pop-in 0.6s ease ${i * 200}ms both, float 1.5s ease-in-out ${i * 300}ms infinite`,
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="neo-card-static bg-brutal-red/20 p-8">
          <div className="mb-4 text-5xl">😵</div>
          <h2 className="font-display text-2xl text-black">
            Ops! Algo deu errado
          </h2>
          <p className="mt-2 font-medium text-black/70">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={fetchRecommendation}
              className="neo-btn bg-brutal-yellow text-black"
            >
              🔄 Tentar novamente
            </button>
            <button
              onClick={() => router.push("/")}
              className="neo-btn bg-white text-black"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  const resolvedType = recommendation.activityType as string;
  const color = typeColors[resolvedType] || "bg-brutal-purple";
  const emoji = typeEmojis[resolvedType] || "🎲";
  const typeLabel = typeLabels[resolvedType] || "Recomendação";
  const isVisual = ["movie", "tv_show", "anime"].includes(resolvedType);

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/")}
        className="neo-btn mb-6 bg-white text-sm text-black"
      >
        ← Início
      </button>

      {/* Main recommendation card */}
      <div className={`neo-card-static animate-pop-in ${color} p-8`}>
        {/* Type badge */}
        <div className="mb-4 inline-block neo-card-static bg-white px-3 py-1 text-sm font-bold text-black">
          {emoji} {typeLabel}
        </div>

        {/* Poster + Info */}
        <div className={`flex gap-6 ${recommendation.imageUrl ? "flex-col sm:flex-row" : "flex-col"}`}>
          {recommendation.imageUrl && (
            <div className="neo-card-static shrink-0 overflow-hidden bg-white p-1 self-center sm:self-start">
              <Image
                src={recommendation.imageUrl}
                alt={recommendation.title}
                width={200}
                height={300}
                className="h-auto w-50 rounded"
              />
            </div>
          )}
          <div className="flex-1">
            {/* Title */}
            <h1 className="font-display text-4xl leading-tight text-black sm:text-5xl">
              {recommendation.title}
            </h1>

            {/* Description */}
            <p className="mt-4 text-lg font-medium leading-relaxed text-black/80">
              {recommendation.description}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 flex flex-wrap gap-2">
          {recommendation.genre && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              🎭 {recommendation.genre}
            </span>
          )}
          {recommendation.releaseYear && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              📅 {recommendation.releaseYear}
            </span>
          )}
          {recommendation.rating && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              ⭐ {recommendation.rating.toFixed(1)}
            </span>
          )}
          {recommendation.seasons && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              📦 {recommendation.seasons} temporada
              {recommendation.seasons > 1 ? "s" : ""}
            </span>
          )}
          {recommendation.episodes && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              🔢 {recommendation.episodes} episódio
              {recommendation.episodes > 1 ? "s" : ""}
            </span>
          )}
          {recommendation.artist && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              🎤 {recommendation.artist}
            </span>
          )}
          {recommendation.language && (
            <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
              🌍 {recommendation.language}
            </span>
          )}
        </div>
      </div>

      {/* Rate limit info */}
      {remaining !== null && (
        <div className="mt-6 text-center">
          <span
            className={`neo-card-static inline-block px-4 py-2 text-sm font-bold text-black ${remaining === 0 ? "bg-brutal-red/30" : "bg-brutal-green/30"}`}
          >
            {remaining === 0
              ? "🚫 Você atingiu o limite diário de recomendações"
              : `⚡ ${remaining} recomendação${remaining > 1 ? "ões" : ""} restante${remaining > 1 ? "s" : ""} hoje`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={fetchRecommendation}
          disabled={remaining === 0}
          className="neo-btn flex-1 bg-brutal-orange text-lg text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          🎲 Outra Recomendação
        </button>
        <button
          onClick={() =>
            router.push(
              isVisual || resolvedType === "music"
                ? `/filtros?activityType=${resolvedType}`
                : "/"
            )
          }
          className="neo-btn bg-white text-lg text-black"
        >
          🎛️ Mudar Filtros
        </button>
        <button
          onClick={() => router.push("/historico")}
          className="neo-btn bg-brutal-cream text-lg text-black"
        >
          📜 Histórico
        </button>
      </div>
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="animate-spin-slow text-5xl">🎲</div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
