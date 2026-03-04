"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface WatchlistItem {
  itemId: string;
  addedAt: string;
  recommendation: {
    id: string;
    title: string;
    activityType: string;
    description: string;
    genre?: string;
    releaseYear?: number;
    rating?: number;
    imageUrl?: string | null;
    seasons?: number;
    episodes?: number;
    artist?: string;
    language?: string;
  };
}

interface Watchlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

export default function WatchlistPage() {
  const router = useRouter();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<
    Record<string, WatchlistItem[]>
  >({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchWatchlists() {
    try {
      const res = await fetch("/api/watchlists");
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data.watchlists);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchItems(watchlistId: string) {
    setLoadingItems(watchlistId);
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedItems((prev) => ({ ...prev, [watchlistId]: data.items }));
      }
    } finally {
      setLoadingItems(null);
    }
  }

  function handleToggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!expandedItems[id]) {
        fetchItems(id);
      }
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWatchlists((prev) => [data.watchlist, ...prev]);
      setNewName("");
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar lista.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWatchlists((prev) => prev.filter((w) => w.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRemoveItem(watchlistId: string, itemId: string) {
    const res = await fetch(`/api/watchlist/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      setExpandedItems((prev) => ({
        ...prev,
        [watchlistId]: prev[watchlistId].filter((i) => i.itemId !== itemId),
      }));
    }
  }

  useEffect(() => {
    fetchWatchlists();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-slow mb-4 inline-block text-6xl">
            📋
          </div>
          <p className="text-lg font-bold text-black/60">
            Carregando suas listas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-black sm:text-4xl">
            📋 Minhas Listas
          </h1>
          <p className="mt-1 font-medium text-black/60">
            {watchlists.length} lista{watchlists.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="neo-btn bg-brutal-yellow text-black"
        >
          + Nova Lista
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="neo-card-static w-full max-w-md bg-white p-6">
            <h2 className="font-display mb-4 text-2xl text-black">
              Nova Lista
            </h2>
            <form onSubmit={handleCreate}>
              <input
                className="neo-input w-full px-3 py-2 text-black"
                placeholder="Ex: Filmes Marvel, Animes Shonen..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                autoFocus
              />
              {createError && (
                <p className="mt-2 text-sm font-bold text-brutal-red">
                  {createError}
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="neo-btn flex-1 bg-brutal-green text-black disabled:opacity-50"
                >
                  {creating ? "Criando..." : "Criar Lista"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                    setCreateError("");
                  }}
                  className="neo-btn bg-white text-black"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {watchlists.length === 0 && (
        <div className="neo-card-static bg-white p-12 text-center">
          <div className="mb-4 text-6xl">📋</div>
          <h2 className="font-display text-2xl text-black">
            Nenhuma lista ainda
          </h2>
          <p className="mt-2 font-medium text-black/60">
            Crie sua primeira lista para salvar recomendações.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="neo-btn mt-6 bg-brutal-yellow text-black"
          >
            + Criar Lista
          </button>
        </div>
      )}

      {/* Watchlist accordion */}
      <div className="space-y-4">
        {watchlists.map((wl) => {
          const isExpanded = expandedId === wl.id;
          const items = expandedItems[wl.id] ?? [];
          return (
            <div
              key={wl.id}
              className="neo-card-static overflow-hidden bg-white"
            >
              {/* Header row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleToggle(wl.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(wl.id);
                  }
                }}
                className="flex cursor-pointer items-center justify-between p-4"
              >
                <div>
                  <h3 className="font-display text-xl text-black">{wl.name}</h3>
                  {isExpanded && (
                    <p className="text-sm font-medium text-black/50">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(wl.id);
                    }}
                    disabled={deletingId === wl.id}
                    className="neo-btn bg-brutal-red px-3 py-1 text-sm text-white disabled:opacity-50"
                  >
                    {deletingId === wl.id ? "..." : "🗑️"}
                  </button>
                  <span
                    className={`text-black/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {/* Expanded items */}
              {isExpanded && (
                <div className="space-y-3 border-t-2 border-black/10 p-4">
                  {loadingItems === wl.id && (
                    <p className="text-center font-bold text-black/50">
                      Carregando...
                    </p>
                  )}
                  {loadingItems !== wl.id && items.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="font-medium text-black/50">
                        Esta lista está vazia. Adicione recomendações do
                        histórico ou da tela de resultado!
                      </p>
                    </div>
                  )}
                  {items.map(({ itemId, recommendation: rec }) => {
                    const config = typeConfig[rec.activityType] ?? {
                      emoji: "🎲",
                      color: "bg-brutal-purple",
                      label: "Outro",
                    };
                    return (
                      <div
                        key={itemId}
                        className={`neo-card-static ${config.color} flex items-center gap-3 p-3`}
                      >
                        {rec.imageUrl ? (
                          <div className="neo-card-static shrink-0 overflow-hidden bg-white p-0.5">
                            <Image
                              src={rec.imageUrl}
                              alt={rec.title}
                              width={48}
                              height={72}
                              className="h-18 w-12 rounded object-cover"
                            />
                          </div>
                        ) : (
                          <div className="neo-card-static flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white text-2xl">
                            {config.emoji}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-display truncate text-base text-black">
                            {rec.title}
                          </p>
                          <p className="text-xs font-medium text-black/60">
                            {config.label}
                            {rec.genre && ` · ${rec.genre}`}
                            {rec.releaseYear && ` · ${rec.releaseYear}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(wl.id, itemId)}
                          className="neo-btn shrink-0 bg-white px-2 py-1 text-sm text-black"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
