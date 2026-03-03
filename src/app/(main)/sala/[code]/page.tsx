"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ACTIVITY_LABELS,
  MOVIE_GENRES,
  MUSIC_GENRES,
  MUSIC_LANGUAGES,
} from "@/types";
import type { ActivityType, Filters } from "@/types";

interface RoomMember {
  userId: string;
  userName: string | null;
  hasSubmitted: boolean;
}

interface RoomState {
  status: "waiting" | "done" | "expired";
  code: string;
  isCreator: boolean;
  currentUserSubmitted: boolean;
  members: RoomMember[];
  allSubmitted: boolean;
  recommendation: RecommendationData | null;
}

interface RecommendationData {
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

export default function SalaRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const [view, setView] = useState<"preferences" | "lobby" | "result">(
    "preferences"
  );
  const [room, setRoom] = useState<RoomState | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Preference state
  const [activityType, setActivityType] = useState<ActivityType>("movie");
  const [genre, setGenre] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [language, setLanguage] = useState("");

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/sala/${code}`);
      if (!res.ok) return;
      const data: RoomState = await res.json();
      setRoom(data);
      if (data.currentUserSubmitted && !hasSubmitted) {
        setHasSubmitted(true);
        setView("lobby");
      }
      if (data.status === "done") {
        setView("result");
      }
    } catch {
      // Ignore fetch errors during polling
    }
  }, [code, hasSubmitted]);

  // Initial fetch
  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Poll every 3s while in preferences or lobby view
  useEffect(() => {
    if (view === "result") return;
    const interval = setInterval(fetchRoom, 3000);
    return () => clearInterval(interval);
  }, [view, fetchRoom]);

  async function handlePreferencesSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filters: Filters = {
      ...(genre && { genre }),
      ...(yearMin && { yearMin: Number(yearMin) }),
      ...(yearMax && { yearMax: Number(yearMax) }),
      ...(activityType !== "music" && ratingMin && { ratingMin: Number(ratingMin) }),
      ...(activityType === "music" && language && { language }),
    };

    const res = await fetch(`/api/sala/${code}/preferencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityType, filters }),
    });

    if (res.ok) {
      setHasSubmitted(true);
      setView("lobby");
      fetchRoom();
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch(`/api/sala/${code}/recomendar`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setGenError(data.error || "Erro ao gerar.");
        return;
      }
      fetchRoom();
    } catch {
      setGenError("Erro de conexão. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  const isMusic = activityType === "music";
  const genreOptions = isMusic ? MUSIC_GENRES : MOVIE_GENRES;

  // Loading state
  if (!room) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin-slow text-6xl">🎲</div>
      </div>
    );
  }

  // --- Preferences View ---
  if (view === "preferences" && !hasSubmitted) {
    return (
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => router.push("/sala")}
          className="neo-btn mb-4 bg-white text-sm text-black"
        >
          ← Voltar
        </button>

        <div className="mb-6">
          <div className="neo-card-static mb-3 inline-block bg-brutal-yellow px-4 py-2 font-bold text-black">
            Sala: {code}
          </div>
          <h1 className="font-display text-3xl text-black">
            Suas Preferências
          </h1>
          <p className="font-medium text-black/60">
            O que você quer assistir/ouvir hoje?
          </p>
          {room.members.length > 0 && (
            <p className="mt-1 text-sm text-black/40">
              {room.members.length} membro{room.members.length > 1 ? "s" : ""}{" "}
              na sala
            </p>
          )}
        </div>

        <form onSubmit={handlePreferencesSubmit} className="space-y-4">
          {/* Activity type */}
          <div className="neo-card-static bg-white p-5">
            <label className="mb-2 block font-bold text-black">🎯 Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(["movie", "tv_show", "anime", "music"] as ActivityType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setActivityType(t);
                      setGenre("");
                    }}
                    className={`neo-btn text-sm text-black ${
                      activityType === t ? "bg-brutal-yellow" : "bg-white"
                    }`}
                  >
                    {ACTIVITY_LABELS[t]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Genre */}
          <div className="neo-card-static animate-pop-in bg-white p-5">
            <label className="mb-2 block font-bold text-black">
              🎭 Gênero
            </label>
            <select
              className="neo-select"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="">Qualquer gênero</option>
              {genreOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div
            className="neo-card-static animate-pop-in bg-white p-5"
            style={{ animationDelay: "80ms" }}
          >
            <label className="mb-2 block font-bold text-black">
              📅 Ano de Lançamento
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className="neo-input"
                placeholder="De"
                min={1950}
                max={new Date().getFullYear()}
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
              />
              <span className="font-bold text-black/40">até</span>
              <input
                type="number"
                className="neo-input"
                placeholder="Até"
                min={1950}
                max={new Date().getFullYear()}
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
              />
            </div>
          </div>

          {/* Rating (non-music) */}
          {!isMusic && (
            <div
              className="neo-card-static animate-pop-in bg-white p-5"
              style={{ animationDelay: "160ms" }}
            >
              <label className="mb-2 block font-bold text-black">
                ⭐ Nota mínima (0 a 10)
              </label>
              <input
                type="number"
                className="neo-input"
                placeholder="Ex: 7"
                min={0}
                max={10}
                step={0.1}
                value={ratingMin}
                onChange={(e) => setRatingMin(e.target.value)}
              />
            </div>
          )}

          {/* Language (music only) */}
          {isMusic && (
            <div
              className="neo-card-static animate-pop-in bg-white p-5"
              style={{ animationDelay: "160ms" }}
            >
              <label className="mb-2 block font-bold text-black">
                🌍 Idioma
              </label>
              <select
                className="neo-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="">Qualquer idioma</option>
                {MUSIC_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="neo-btn w-full bg-brutal-yellow text-lg text-black"
          >
            ✅ Confirmar Preferências
          </button>
        </form>
      </div>
    );
  }

  // --- Result View ---
  if (view === "result" && room.recommendation) {
    const rec = room.recommendation;
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
    const color = typeColors[rec.activityType] || "bg-brutal-purple";
    const emoji = typeEmojis[rec.activityType] || "🎲";

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">👥</div>
          <h1 className="font-display text-3xl text-black">
            Recomendação do Grupo
          </h1>
          <p className="font-medium text-black/60">
            Escolhido especialmente para vocês
          </p>
        </div>

        <div className={`neo-card-static animate-pop-in ${color} p-8`}>
          <div className="neo-card-static mb-4 inline-block bg-white px-3 py-1 text-sm font-bold text-black">
            {emoji} Recomendação em Grupo
          </div>

          <div
            className={`flex gap-6 ${rec.imageUrl ? "flex-col sm:flex-row" : "flex-col"}`}
          >
            {rec.imageUrl && (
              <div className="neo-card-static shrink-0 self-center overflow-hidden bg-white p-1 sm:self-start">
                <Image
                  src={rec.imageUrl}
                  alt={rec.title}
                  width={200}
                  height={300}
                  className="h-auto w-50 rounded"
                />
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-display text-4xl leading-tight text-black">
                {rec.title}
              </h2>
              <p className="mt-4 text-lg font-medium leading-relaxed text-black/80">
                {rec.description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {rec.genre && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                🎭 {rec.genre}
              </span>
            )}
            {rec.releaseYear && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                📅 {rec.releaseYear}
              </span>
            )}
            {rec.rating && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                ⭐ {rec.rating.toFixed(1)}
              </span>
            )}
            {rec.seasons && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                📦 {rec.seasons} temporada{rec.seasons > 1 ? "s" : ""}
              </span>
            )}
            {rec.episodes && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                🔢 {rec.episodes} episódio{rec.episodes > 1 ? "s" : ""}
              </span>
            )}
            {rec.artist && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                🎤 {rec.artist}
              </span>
            )}
            {rec.language && (
              <span className="neo-card-static bg-white px-3 py-1.5 text-sm font-bold text-black">
                🌍 {rec.language}
              </span>
            )}
          </div>
        </div>

        {/* Members who participated */}
        <div className="neo-card-static mt-6 bg-white p-4">
          <p className="text-sm font-bold text-black/60">
            👥 Participantes: {room.members.map((m) => m.userName || "Usuário").join(", ")}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/")}
            className="neo-btn flex-1 bg-brutal-yellow text-lg text-black"
          >
            🏠 Voltar ao Início
          </button>
          <button
            onClick={() => router.push("/historico")}
            className="neo-btn bg-white text-lg text-black"
          >
            📜 Histórico
          </button>
        </div>
      </div>
    );
  }

  // --- Lobby View (default after submitting preferences) ---
  const allReady = room.allSubmitted;

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.push("/sala")}
        className="neo-btn mb-4 bg-white text-sm text-black"
      >
        ← Voltar
      </button>

      <div className="mb-6 text-center">
        <div className="neo-card-static mb-4 inline-block bg-brutal-yellow px-6 py-3">
          <p className="mb-1 text-xs font-bold text-black/60">
            CÓDIGO DA SALA
          </p>
          <p className="font-display text-4xl tracking-widest text-black">
            {code}
          </p>
        </div>
        <p className="font-medium text-black/60">
          Compartilhe o código com seus amigos
        </p>
      </div>

      {/* Members list */}
      <div className="neo-card-static mb-6 bg-white p-5">
        <h2 className="mb-4 font-bold text-black">
          👥 Membros ({room.members.length})
        </h2>
        <div className="space-y-3">
          {room.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between">
              <span className="font-medium text-black">
                {m.userName || "Usuário"}
              </span>
              <span
                className={`neo-card-static px-3 py-1 text-xs font-bold ${
                  m.hasSubmitted
                    ? "bg-brutal-green text-black"
                    : "bg-brutal-cream text-black/50"
                }`}
              >
                {m.hasSubmitted ? "✅ Pronto" : "⏳ Aguardando..."}
              </span>
            </div>
          ))}
        </div>
      </div>

      {genError && (
        <div className="neo-card-static mb-4 bg-brutal-red/20 p-4 text-center font-bold text-black">
          {genError}
        </div>
      )}

      {room.isCreator ? (
        <button
          onClick={handleGenerate}
          disabled={!allReady || generating}
          className="neo-btn w-full bg-brutal-orange text-lg text-black disabled:opacity-50"
        >
          {generating
            ? "🎲 A IA está pensando..."
            : allReady
              ? "🚀 Gerar Recomendação do Grupo"
              : "⏳ Aguardando todos confirmarem..."}
        </button>
      ) : (
        <div className="neo-card-static bg-brutal-cream p-4 text-center font-bold text-black">
          {allReady
            ? "✅ Todos prontos! Aguardando o criador gerar..."
            : "⏳ Aguardando os demais membros..."}
        </div>
      )}

      {!hasSubmitted && (
        <button
          onClick={() => setView("preferences")}
          className="neo-btn mt-3 w-full bg-brutal-sky text-black"
        >
          🎛️ Enviar Minhas Preferências
        </button>
      )}
    </div>
  );
}
