import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { getRecommendation } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { getDailyLimit, getTodayCount } from "@/lib/rate-limit";
import { fetchAnimeDetails } from "@/lib/mal";
import { fetchMediaDetails } from "@/lib/tmdb";
import {
  formatZodError,
  recommendationSchema,
  safeParseJson,
} from "@/lib/validation";
import type { ActivityType } from "@/types";
import { and, count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Rate limit: max daily recommendations per user
  const dailyLimit = await getDailyLimit(session.user.id);
  const todayCount = await getTodayCount(session.user.id);
  if (todayCount >= dailyLimit) {
    return NextResponse.json(
      {
        error: `Você atingiu o limite de ${dailyLimit} recomendações por dia. Volte amanhã!`,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  const { data, error } = await safeParseJson(request);
  if (error) return error;

  const result = recommendationSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 },
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
      previousTitles,
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
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao gerar recomendação. Tente novamente." },
      { status: 500 },
    );
  }

  // Enrich with external data: MAL for anime, TMDB for movies/TV
  const tmdbDetails =
    resolvedType === "anime"
      ? await fetchAnimeDetails(recommendation.title)
      : await fetchMediaDetails(recommendation.title, resolvedType);

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
    remaining: dailyLimit - todayCount - 1,
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    5,
    Math.max(1, Number(searchParams.get("limit")) || 10),
  );
  const offset = (page - 1) * limit;
  const type = searchParams.get("type");
  const watched = searchParams.get("watched");

  const conditions = [eq(recommendations.userId, session.user.id)];
  if (type) conditions.push(eq(recommendations.activityType, type));
  if (watched === "true") {
    conditions.push(eq(recommendations.watched, true));
  } else if (watched !== "all") {
    conditions.push(eq(recommendations.watched, false));
  }

  const whereClause = and(...conditions);

  const [history, [{ total }]] = await Promise.all([
    db
      .select()
      .from(recommendations)
      .where(whereClause)
      .orderBy(desc(recommendations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(recommendations)
      .where(whereClause),
  ]);

  return NextResponse.json({ recommendations: history, total, page, limit });
}
