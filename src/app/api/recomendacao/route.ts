import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getRecommendation } from "@/lib/ai";
import { fetchImageUrl } from "@/lib/tmdb";
import type { ActivityType, Filters } from "@/types";

const DAILY_LIMIT = 3;

function getStartOfDay(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

async function getTodayCount(userId: string): Promise<number> {
  const startOfDay = getStartOfDay();
  const todayRecs = await db
    .select({ id: recommendations.id })
    .from(recommendations)
    .where(
      and(
        eq(recommendations.userId, userId),
        gte(recommendations.createdAt, startOfDay)
      )
    );
  return todayRecs.length;
}

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

  const { activityType, filters } = (await request.json()) as {
    activityType: ActivityType;
    filters: Filters;
  };

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
  let imageUrl: string | null = null;
  try {
    recommendation = await getRecommendation(
      resolvedType,
      filters,
      previousTitles
    );
    imageUrl = await fetchImageUrl(recommendation.title, resolvedType);
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

  // Save to history
  const [saved] = await db
    .insert(recommendations)
    .values({
      userId: session.user.id,
      activityType: resolvedType,
      title: recommendation.title,
      description: recommendation.description,
      genre: recommendation.genre,
      releaseYear: recommendation.releaseYear,
      rating: recommendation.rating,
      seasons: recommendation.seasons,
      episodes: recommendation.episodes,
      artist: recommendation.artist,
      language: recommendation.language,
      imageUrl,
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
