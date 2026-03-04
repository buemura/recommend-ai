import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getRecommendation } from "@/lib/ai";
import { fetchMediaDetails } from "@/lib/tmdb";
import { getTodayCount, DAILY_LIMIT } from "@/lib/rate-limit";
import {
  safeParseJson,
  recommendationSchema,
  formatZodError,
} from "@/lib/validation";
import type { ActivityType } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Rate limit: max DAILY_LIMIT recommendations per day
  const todayCount = await getTodayCount(session.user.id);
  if (todayCount >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Você atingiu o limite de ${DAILY_LIMIT} recomendações por dia. Volte amanhã!`,
        remaining: 0,
      },
      { status: 429 }
    );
  }

  const { data, error } = await safeParseJson(request);
  if (error) return error;

  const result = recommendationSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }
  const { activityType, filters } = result.data;

  // Resolve random activity
  const resolvedType: ActivityType =
    activityType === "random"
      ? (["movie", "tv_show", "anime", "music"] as const)[
          Math.floor(Math.random() * 4)
        ]
      : activityType;

  // Get previous recommendations to avoid repeats
  const previous = await db
    .select({ title: recommendations.title })
    .from(recommendations)
    .where(eq(recommendations.userId, session.user.id))
    .orderBy(desc(recommendations.createdAt))
    .limit(20);

  const previousTitles = previous.map((r) => r.title);

  let recommendation;
  try {
    recommendation = await getRecommendation(
      resolvedType,
      filters,
      previousTitles
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    if (message.includes("429") || message.includes("Too Many Requests")) {
      return NextResponse.json(
        {
          error:
            "A IA está temporariamente indisponível (limite de requisições atingido). Tente novamente em alguns minutos.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao gerar recomendação. Tente novamente." },
      { status: 500 }
    );
  }

  // For non-music types, fetch details from TMDB
  const tmdbDetails = await fetchMediaDetails(recommendation.title, resolvedType);

  // Save to history
  const [saved] = await db
    .insert(recommendations)
    .values({
      userId: session.user.id,
      activityType: resolvedType,
      title: tmdbDetails?.title || recommendation.title,
      description: tmdbDetails?.description || recommendation.description,
      genre: tmdbDetails?.genre || recommendation.genre,
      releaseYear: tmdbDetails?.releaseYear || recommendation.releaseYear,
      rating: tmdbDetails?.rating || recommendation.rating,
      seasons: tmdbDetails?.seasons || recommendation.seasons,
      episodes: tmdbDetails?.episodes || recommendation.episodes,
      artist: recommendation.artist,
      language: recommendation.language,
      imageUrl: tmdbDetails?.imageUrl || null,
    })
    .returning();

  return NextResponse.json({
    recommendation: saved,
    remaining: DAILY_LIMIT - todayCount - 1,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const history = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.userId, session.user.id))
    .orderBy(desc(recommendations.createdAt));

  return NextResponse.json({ recommendations: history });
}
