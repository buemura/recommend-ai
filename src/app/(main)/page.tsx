"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const activities = [
  {
    type: "movie",
    label: "Assistir um Filme",
    emoji: "🎬",
    color: "bg-brutal-yellow",
    description: "Deixa a IA escolher o filme perfeito pra hoje",
  },
  {
    type: "tv_show",
    label: "Assistir uma Série",
    emoji: "📺",
    color: "bg-brutal-sky",
    description: "Encontre sua próxima série favorita",
  },
  {
    type: "anime",
    label: "Assistir um Anime",
    emoji: "⛩️",
    color: "bg-brutal-pink",
    description: "Descubra animes incríveis pra maratonar",
  },
  {
    type: "music",
    label: "Ouvir uma Música",
    emoji: "🎵",
    color: "bg-brutal-green",
    description: "Novas músicas pra sua playlist",
  },
  {
    type: "random",
    label: "Surpreenda-me!",
    emoji: "🎲",
    color: "bg-brutal-purple",
    description: "Deixa o destino decidir por você",
  },
] as const;

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-slow mb-4 inline-block text-6xl">🎲</div>
          <p className="text-lg font-bold text-black/60">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  function handleSelect(type: string) {
    if (type === "random") {
      router.push("/resultado?activityType=random");
    } else {
      router.push(`/filtros?activityType=${type}`);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl text-black sm:text-5xl">
          O que vamos curtir hoje?
        </h1>
        <p className="mt-3 text-lg font-medium text-black/60">
          Escolha uma atividade e deixe a IA fazer a mágica ✨
        </p>
      </div>

      {/* Activity Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((activity, i) => (
          <button
            key={activity.type}
            onClick={() => handleSelect(activity.type)}
            className={`neo-card animate-pop-in ${activity.color} p-6 text-left`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mb-3 text-5xl">{activity.emoji}</div>
            <h2 className="font-display text-2xl text-black">
              {activity.label}
            </h2>
            <p className="mt-1 text-sm font-medium text-black/70">
              {activity.description}
            </p>
          </button>
        ))}
      </div>

      {/* Decorative bottom */}
      <div className="mt-12 text-center">
        <div className="inline-block neo-card-static bg-brutal-cream px-6 py-3">
          <p className="text-sm font-bold text-black/50">
            Recomendações geradas por IA 🤖 — Powered by Gemini/OpenAI
          </p>
        </div>
      </div>
    </div>
  );
}
