"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AddToWatchlistModal } from "@/components/add-to-watchlist-modal";

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
  createdAt: string;
}

const typeConfig: Record<
  string,
  { emoji: string; color: string; label: string }
> = {
  movie: { emoji: "🎬", color: "bg-brutal-yellow", label: "Filme" },
  tv_show: { emoji: "📺", color: "bg-brutal-sky", label: "Série" },
  anime: { emoji: "⛩️", color: "bg-brutal-pink", label: "Anime" },
  music: { emoji: "🎵", color: "bg-brutal-green", label: "Música" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDate(
  items: RecommendationData[],
): Record<string, RecommendationData[]> {
  const groups: Record<string, RecommendationData[]> = {};
  for (const item of items) {
    const key = formatDate(item.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function HistoricoPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationData[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [watchlistTarget, setWatchlistTarget] = useState<string | null>(null);
  const limit = 10;

  async function fetchHistory(
    pageNum: number,
    type: string | null = activeFilter,
  ) {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
      });
      if (type) params.set("type", type);
      const res = await fetch(`/api/recomendacao?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTotal(data.total);
        if (pageNum === 1) {
          setRecommendations(data.recommendations);
        } else {
          setRecommendations((prev) => [...prev, ...data.recommendations]);
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleShare(rec: RecommendationData) {
    const shareUrl = `${window.location.origin}/compartilhar/${rec.id}`;
    const shareData = {
      title: rec.title,
      text: rec.description,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleFilterChange(type: string | null) {
    setActiveFilter(type);
    setPage(1);
    setRecommendations([]);
    setLoading(true);
    fetchHistory(1, type);
  }

  useEffect(() => {
    fetchHistory(1);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-slow mb-4 inline-block text-6xl">📜</div>
          <p className="text-lg font-bold text-black/60">
            Carregando histórico...
          </p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(recommendations);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-black sm:text-4xl">
            📜 Seu Histórico
          </h1>
          <p className="mt-1 font-medium text-black/60">
            {total} recomendaç
            {total !== 1 ? "ões" : "ão"} no total
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="neo-btn bg-brutal-yellow text-black"
        >
          + Nova
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange(null)}
          className={`neo-card-static px-3 py-1.5 text-sm font-bold transition-colors ${
            activeFilter === null
              ? "bg-black text-white"
              : "bg-white text-black"
          }`}
        >
          Todos
        </button>
        {Object.entries(typeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`neo-card-static px-3 py-1.5 text-sm font-bold transition-colors ${
              activeFilter === key
                ? "bg-black text-white"
                : "bg-white text-black"
            }`}
          >
            {config.emoji} {config.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {recommendations.length === 0 && (
        <div className="neo-card-static bg-white p-12 text-center">
          <div className="mb-4 text-6xl">🫥</div>
          <h2 className="font-display text-2xl text-black">
            Nada por aqui ainda
          </h2>
          <p className="mt-2 font-medium text-black/60">
            Suas recomendações aparecerão aqui depois que você pedir a primeira.
          </p>
          <button
            onClick={() => router.push("/")}
            className="neo-btn mt-6 bg-brutal-yellow text-black"
          >
            🎲 Pedir Recomendação
          </button>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-0.5 w-4 bg-black/30" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-black/50">
              {date}
            </h3>
            <div className="h-0.5 flex-1 bg-black/30" />
          </div>

          <div className="space-y-4">
            {items.map((rec, i) => {
              const config = typeConfig[rec.activityType] || {
                emoji: "🎲",
                color: "bg-brutal-purple",
                label: "Outro",
              };
              const isExpanded = expandedId === rec.id;
              return (
                <div
                  key={rec.id}
                  className={`neo-card-static animate-pop-in ${config.color} overflow-hidden`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Card header: clickable on mobile, static on desktop */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : rec.id);
                      }
                    }}
                    className="flex w-full cursor-pointer items-start gap-4 p-4 text-left md:cursor-default"
                  >
                    <div className="shrink-0 flex flex-col items-center justify-between gap-4 self-stretch">
                      {rec.imageUrl ? (
                        <div className="neo-card-static overflow-hidden bg-white p-0.5">
                          <Image
                            src={rec.imageUrl}
                            alt={rec.title}
                            width={128}
                            height={192}
                            className="h-48 w-32 rounded object-cover"
                          />
                        </div>
                      ) : (
                        <div className="neo-card-static flex h-48 w-32 items-center justify-center rounded bg-white text-4xl">
                          {config.emoji}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-4">
                        <span className="neo-card-static bg-white px-2 py-0.5 text-xs font-bold text-black">
                          {config.label}
                        </span>
                        {rec.genre && (
                          <span className="truncate text-xs font-bold text-black/50">
                            {rec.genre}
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-lg text-black">
                        {rec.title}
                      </h4>

                      {/* Badges: always visible */}
                      <div className="flex flex-wrap gap-1.5">
                        {rec.releaseYear && (
                          <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                            📅 {rec.releaseYear}
                          </span>
                        )}
                        {rec.rating && (
                          <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                            ⭐ {rec.rating.toFixed(1)}
                          </span>
                        )}
                        {rec.artist && (
                          <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                            🎤 {rec.artist}
                          </span>
                        )}
                        {rec.language && (
                          <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                            🌍 {rec.language}
                          </span>
                        )}
                        {rec.seasons && (
                          <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                            📦 {rec.seasons}T
                          </span>
                        )}
                        {rec.episodes && (
                          <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                            🔢 {rec.episodes}ep
                          </span>
                        )}
                      </div>

                      {/* Desktop: description inline */}
                      <p className="hidden text-sm font-medium text-black/70 md:block">
                        {rec.description}
                      </p>
                    </div>
                    {/* Share + watchlist + chevron */}
                    <div className="shrink-0 flex flex-col items-center justify-between self-stretch">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(rec);
                          }}
                          className="neo-card-static bg-white px-2 py-1 text-lg cursor-pointer"
                        >
                          {copiedId === rec.id ? "✅" : "📤"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWatchlistTarget(rec.id);
                          }}
                          className="neo-card-static bg-white px-2 py-1 text-lg cursor-pointer"
                        >
                          📋
                        </button>
                      </div>
                      <span
                        className={`text-sm text-black/40 transition-transform md:hidden ${isExpanded ? "rotate-180" : ""}`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Mobile: expandable details */}
                  {isExpanded && (
                    <div className="border-t-2 border-black/10 px-4 pb-4 pt-3 md:hidden">
                      <p className="text-sm font-medium text-black/70">
                        {rec.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {watchlistTarget && (
        <AddToWatchlistModal
          recommendationId={watchlistTarget}
          onClose={() => setWatchlistTarget(null)}
        />
      )}

      {/* Load more button */}
      {recommendations.length < total && (
        <div className="mt-4 mb-8 text-center">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              setLoadingMore(true);
              fetchHistory(nextPage);
            }}
            disabled={loadingMore}
            className="neo-btn bg-brutal-sky text-black disabled:opacity-50"
          >
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
