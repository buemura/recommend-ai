"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface FeedItem {
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
  authorName: string | null;
  authorImage: string | null;
  likesCount: number;
  isLiked: boolean;
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 10;

  async function fetchFeed(
    pageNum: number,
    type: string | null = activeFilter
  ) {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
      });
      if (type) params.set("type", type);
      const res = await fetch(`/api/feed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTotal(data.total);
        if (pageNum === 1) {
          setFeed(data.feed);
        } else {
          setFeed((prev) => [...prev, ...data.feed]);
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleLike(id: string) {
    setLikingId(id);
    try {
      const res = await fetch(`/api/feed/${id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFeed((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, isLiked: data.liked, likesCount: data.likesCount }
              : item
          )
        );
      }
    } finally {
      setLikingId(null);
    }
  }

  async function handleShare(item: FeedItem) {
    const shareUrl = `${window.location.origin}/compartilhar/${item.id}`;
    const shareData = {
      title: item.title,
      text: item.description,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleFilterChange(type: string | null) {
    setActiveFilter(type);
    setPage(1);
    setFeed([]);
    setLoading(true);
    fetchFeed(1, type);
  }

  useEffect(() => {
    fetchFeed(1);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-slow mb-4 inline-block text-6xl">📢</div>
          <p className="text-lg font-bold text-black/60">Carregando feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-black sm:text-4xl">
          📢 Feed Social
        </h1>
        <p className="mt-1 font-medium text-black/60">
          Descubra o que outros usuários estão assistindo
        </p>
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
      {feed.length === 0 && (
        <div className="neo-card-static bg-white p-12 text-center">
          <div className="mb-4 text-6xl">🫥</div>
          <h2 className="font-display text-2xl text-black">
            Nada por aqui ainda
          </h2>
          <p className="mt-2 font-medium text-black/60">
            O feed ficará movimentado quando mais pessoas usarem o RecommendAI!
          </p>
        </div>
      )}

      {/* Feed list */}
      <div className="space-y-4">
        {feed.map((item, i) => {
          const config = typeConfig[item.activityType] || {
            emoji: "🎲",
            color: "bg-brutal-purple",
            label: "Outro",
          };
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`neo-card-static animate-pop-in ${config.color} overflow-hidden`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Author header */}
              <div className="flex items-center gap-2 border-b-2 border-black/10 px-4 py-2.5">
                {item.authorImage ? (
                  <img
                    src={item.authorImage}
                    alt=""
                    className="h-7 w-7 rounded-full border-2 border-black"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-brutal-purple text-xs font-black text-white">
                    {item.authorName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <span className="text-sm font-bold text-black">
                  {item.authorName || "Usuário"}
                </span>
                <span className="text-xs font-medium text-black/40">
                  {timeAgo(item.createdAt)}
                </span>
              </div>

              {/* Card body */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : item.id);
                  }
                }}
                className="flex w-full cursor-pointer items-start gap-4 p-4 text-left md:cursor-default"
              >
                <div className="shrink-0">
                  {item.imageUrl ? (
                    <div className="neo-card-static overflow-hidden bg-white p-0.5">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
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
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
                    <span className="neo-card-static bg-white px-2 py-0.5 text-xs font-bold text-black">
                      {config.label}
                    </span>
                    {item.genre && (
                      <span className="truncate text-xs font-bold text-black/50">
                        {item.genre}
                      </span>
                    )}
                  </div>
                  <h4 className="font-display text-lg text-black">
                    {item.title}
                  </h4>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.releaseYear && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                        📅 {item.releaseYear}
                      </span>
                    )}
                    {item.rating && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                        ⭐ {item.rating.toFixed(1)}
                      </span>
                    )}
                    {item.artist && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                        🎤 {item.artist}
                      </span>
                    )}
                    {item.language && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                        🌍 {item.language}
                      </span>
                    )}
                    {item.seasons && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                        📦 {item.seasons}T
                      </span>
                    )}
                    {item.episodes && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                        🔢 {item.episodes}ep
                      </span>
                    )}
                  </div>

                  {/* Desktop description */}
                  <p className="hidden text-sm font-medium text-black/70 md:block">
                    {item.description}
                  </p>
                </div>

                {/* Actions column */}
                <div className="shrink-0 flex flex-col items-center justify-between self-stretch">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(item.id);
                      }}
                      disabled={likingId === item.id}
                      className="neo-card-static bg-white px-2 py-1 text-lg cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>{item.isLiked ? "❤️" : "🤍"}</span>
                      {item.likesCount > 0 && (
                        <span className="text-xs font-bold text-black/60">
                          {item.likesCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(item);
                      }}
                      className="neo-card-static bg-white px-2 py-1 text-lg cursor-pointer"
                    >
                      {copiedId === item.id ? "✅" : "📤"}
                    </button>
                  </div>
                  <span
                    className={`text-sm text-black/40 transition-transform md:hidden ${isExpanded ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {/* Mobile expandable */}
              {isExpanded && (
                <div className="border-t-2 border-black/10 px-4 pb-4 pt-3 md:hidden">
                  <p className="text-sm font-medium text-black/70">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {feed.length < total && (
        <div className="mt-4 mb-8 text-center">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              setLoadingMore(true);
              fetchFeed(nextPage);
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
