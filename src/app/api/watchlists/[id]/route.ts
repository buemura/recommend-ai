import { db } from "@/db";
import { watchlists, watchlistItems, recommendations } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createWatchlistSchema,
  formatZodError,
  safeParseJson,
} from "@/lib/validation";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const [watchlist] = await db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, session.user.id)));

  if (!watchlist) {
    return NextResponse.json(
      { error: "Lista não encontrada." },
      { status: 404 },
    );
  }

  const items = await db
    .select({
      itemId: watchlistItems.id,
      addedAt: watchlistItems.addedAt,
      recommendation: {
        id: recommendations.id,
        activityType: recommendations.activityType,
        title: recommendations.title,
        description: recommendations.description,
        genre: recommendations.genre,
        releaseYear: recommendations.releaseYear,
        rating: recommendations.rating,
        seasons: recommendations.seasons,
        episodes: recommendations.episodes,
        artist: recommendations.artist,
        language: recommendations.language,
        imageUrl: recommendations.imageUrl,
      },
    })
    .from(watchlistItems)
    .innerJoin(
      recommendations,
      eq(recommendations.id, watchlistItems.recommendationId),
    )
    .where(eq(watchlistItems.watchlistId, id))
    .orderBy(desc(watchlistItems.addedAt));

  return NextResponse.json({ watchlist, items });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const [watchlist] = await db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, session.user.id)));

  if (!watchlist) {
    return NextResponse.json(
      { error: "Lista não encontrada." },
      { status: 404 },
    );
  }

  const { data, error } = await safeParseJson(request);
  if (error) return error;

  const result = createWatchlistSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(watchlists)
    .set({ name: result.data.name, updatedAt: new Date() })
    .where(eq(watchlists.id, id))
    .returning();

  return NextResponse.json({ watchlist: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const [watchlist] = await db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, session.user.id)));

  if (!watchlist) {
    return NextResponse.json(
      { error: "Lista não encontrada." },
      { status: 404 },
    );
  }

  await db.delete(watchlists).where(eq(watchlists.id, id));

  return NextResponse.json({ ok: true });
}
