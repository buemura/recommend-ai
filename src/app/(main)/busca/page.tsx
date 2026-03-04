"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface SearchResult {
  id?: string;
  activityType: string;
  title: string;
  description: string;
  genre?: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  seasons?: number | null;
  episodes?: number | null;
  imageUrl?: string | null;
}

const typeConfig: Record<
  string,
  { emoji: string; color: string; label: string }
> = {
  movie: { emoji: "🎬", color: "bg-brutal-yellow", label: "Filme" },
  tv_show: { emoji: "📺", color: "bg-brutal-sky", label: "Série" },
  anime: { emoji: "⛩️", color: "bg-brutal-pink", label: "Anime" },
};

export default function BuscaPage() {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("movie");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(query, activeType);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeType]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchResults(q: string, type: string) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({ q, type });
      const res = await fetch(`/api/busca?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleTypeChange(type: string) {
    setActiveType(type);
    setExpandedId(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl text-black sm:text-4xl">
          🔍 Buscar
        </h1>
        <p className="mt-1 font-medium text-black/60">
          Pesquise filmes, séries e animes sem gastar recomendações
        </p>
      </div>

      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome do filme, série ou anime..."
          className="neo-card-static w-full bg-white px-4 py-3 text-lg font-medium text-black placeholder:text-black/40 focus:outline-none"
          autoFocus
        />
      </div>

      {/* Type tabs */}
      <div className="mb-6 flex gap-2">
        {Object.entries(typeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleTypeChange(key)}
            className={`neo-card-static px-3 py-1.5 text-sm font-bold transition-colors ${
              activeType === key
                ? "bg-black text-white"
                : "bg-white text-black"
            }`}
          >
            {config.emoji} {config.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin-slow mb-4 inline-block text-5xl">
              🔍
            </div>
            <p className="text-lg font-bold text-black/60">Buscando...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div className="neo-card-static bg-white p-12 text-center">
          <div className="mb-4 text-6xl">🫥</div>
          <h2 className="font-display text-2xl text-black">
            Nenhum resultado encontrado
          </h2>
          <p className="mt-2 font-medium text-black/60">
            Tente buscar com outro termo ou mude a categoria.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <div className="neo-card-static bg-brutal-cream p-12 text-center">
          <div className="mb-4 text-6xl">🎬</div>
          <h2 className="font-display text-2xl text-black">
            Comece a digitar para buscar
          </h2>
          <p className="mt-2 font-medium text-black/60">
            Busque por título — sem usar IA, sem gastar créditos.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((rec, i) => {
            const config = typeConfig[rec.activityType] || {
              emoji: "🎲",
              color: "bg-brutal-purple",
              label: "Outro",
            };
            const cardKey = rec.id || `${rec.title}-${i}`;
            const isExpanded = expandedId === cardKey;

            return (
              <div
                key={cardKey}
                className={`neo-card-static animate-pop-in ${config.color} overflow-hidden`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setExpandedId(isExpanded ? null : cardKey)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : cardKey);
                    }
                  }}
                  className="flex w-full cursor-pointer items-start gap-4 p-4 text-left md:cursor-default"
                >
                  {/* Poster */}
                  <div className="shrink-0">
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

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
                      <span className="neo-card-static bg-white px-2 py-0.5 text-xs font-bold text-black">
                        {config.label}
                      </span>
                      {rec.id && (
                        <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/50">
                          No seu histórico
                        </span>
                      )}
                    </div>

                    <h4 className="font-display text-lg text-black">
                      {rec.title}
                    </h4>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {rec.genre && (
                        <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-bold text-black/70">
                          🎭 {rec.genre}
                        </span>
                      )}
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

                  {/* Mobile chevron */}
                  <div className="shrink-0 self-end md:hidden">
                    <span
                      className={`text-sm text-black/40 transition-transform inline-block ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {/* Mobile: expandable description */}
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
      )}
    </div>
  );
}
