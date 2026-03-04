import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { searchAnime } from "@/lib/mal";
import { searchMedia } from "@/lib/tmdb";
import type { TmdbMediaDetails } from "@/lib/tmdb";
import { and, eq, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

interface SearchResult extends TmdbMediaDetails {
  activityType: string;
  id?: string;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "movie";

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "A busca deve ter pelo menos 2 caracteres." },
      { status: 400 }
    );
  }

  if (!["movie", "tv_show", "anime"].includes(type)) {
    return NextResponse.json(
      { error: "Tipo inválido. Use: movie, tv_show ou anime." },
      { status: 400 }
    );
  }

  // 1. Search user's own recommendations
  const userRecs = await db
    .select()
    .from(recommendations)
    .where(
      and(
        eq(recommendations.userId, session.user.id),
        eq(recommendations.activityType, type),
        ilike(recommendations.title, `%${query}%`)
      )
    )
    .limit(5);

  const recResults: SearchResult[] = userRecs.map((r) => ({
    id: r.id,
    activityType: r.activityType,
    title: r.title,
    description: r.description,
    genre: r.genre,
    releaseYear: r.releaseYear,
    rating: r.rating,
    seasons: r.seasons,
    episodes: r.episodes,
    imageUrl: r.imageUrl,
  }));

  // 2. Search external APIs
  let externalResults: TmdbMediaDetails[] = [];
  if (type === "anime") {
    externalResults = await searchAnime(query);
  } else {
    externalResults = await searchMedia(query, type as "movie" | "tv_show");
  }

  const externalMapped: SearchResult[] = externalResults.map((r) => ({
    ...r,
    activityType: type,
  }));

  // 3. Deduplicate: user recs first, then external
  const seen = new Set(recResults.map((r) => r.title.toLowerCase()));
  const combined = [...recResults];
  for (const r of externalMapped) {
    const key = r.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(r);
    }
  }

  return NextResponse.json({ results: combined.slice(0, 10) });
}
