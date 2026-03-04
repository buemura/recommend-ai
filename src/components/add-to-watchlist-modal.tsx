"use client";

import { useState, useEffect } from "react";

interface Watchlist {
  id: string;
  name: string;
  contains: boolean;
  itemId: string | null;
}

interface AddToWatchlistModalProps {
  recommendationId: string;
  onClose: () => void;
}

export function AddToWatchlistModal({
  recommendationId,
  onClose,
}: AddToWatchlistModalProps) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function fetchLists() {
    try {
      const res = await fetch(
        `/api/watchlist/by-recommendation/${recommendationId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data.watchlists);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(wl: Watchlist) {
    setToggling(wl.id);
    try {
      if (wl.contains && wl.itemId) {
        const res = await fetch(`/api/watchlist/${wl.itemId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setWatchlists((prev) =>
            prev.map((w) =>
              w.id === wl.id ? { ...w, contains: false, itemId: null } : w,
            ),
          );
        }
      } else {
        const res = await fetch(`/api/watchlist/${wl.id}/item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recommendationId }),
        });
        if (res.ok) {
          const data = await res.json();
          setWatchlists((prev) =>
            prev.map((w) =>
              w.id === wl.id
                ? { ...w, contains: true, itemId: data.item.id }
                : w,
            ),
          );
        }
      }
    } finally {
      setToggling(null);
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

      const addRes = await fetch(`/api/watchlist/${data.watchlist.id}/item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      });
      const addData = addRes.ok ? await addRes.json() : null;

      setWatchlists((prev) => [
        {
          ...data.watchlist,
          contains: !!addData,
          itemId: addData?.item?.id ?? null,
        },
        ...prev,
      ]);
      setNewName("");
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar lista.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    fetchLists();
  }, [recommendationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="neo-card-static w-full max-w-md bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-black">Salvar em Lista</h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-black/40 hover:text-black"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center font-bold text-black/50">
            Carregando listas...
          </div>
        ) : (
          <>
            {watchlists.length === 0 && !showCreate && (
              <p className="mb-4 text-sm font-medium text-black/60">
                Você ainda não tem listas. Crie uma abaixo!
              </p>
            )}

            <div className="max-h-60 space-y-2 overflow-y-auto">
              {watchlists.map((wl) => (
                <button
                  key={wl.id}
                  onClick={() => handleToggle(wl)}
                  disabled={toggling === wl.id}
                  className={`neo-card-static flex w-full items-center justify-between px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                    wl.contains ? "bg-brutal-green" : "bg-brutal-cream"
                  }`}
                >
                  <span className="font-bold text-black">{wl.name}</span>
                  <span className="text-xl">
                    {toggling === wl.id ? "..." : wl.contains ? "✅" : "➕"}
                  </span>
                </button>
              ))}
            </div>

            {showCreate ? (
              <form onSubmit={handleCreate} className="mt-4">
                <input
                  className="neo-input w-full px-3 py-2 text-black"
                  placeholder="Nome da nova lista..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                {createError && (
                  <p className="mt-1 text-sm font-bold text-brutal-red">
                    {createError}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="neo-btn flex-1 bg-brutal-green text-sm text-black disabled:opacity-50"
                  >
                    {creating ? "Criando..." : "Criar e Adicionar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setNewName("");
                      setCreateError("");
                    }}
                    className="neo-btn bg-white text-sm text-black"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="neo-btn mt-4 w-full bg-brutal-yellow text-sm text-black"
              >
                + Nova Lista
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
