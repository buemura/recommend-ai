import { db } from "@/db";
import { watchlists, watchlistItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  addWatchlistItemSchema,
  formatZodError,
  safeParseJson,
} from "@/lib/validation";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id: watchlistId } = await params;

  const [watchlist] = await db
    .select()
    .from(watchlists)
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, session.user.id),
      ),
    );

  if (!watchlist) {
    return NextResponse.json(
      { error: "Lista não encontrada." },
      { status: 404 },
    );
  }

  const { data, error } = await safeParseJson(request);
  if (error) return error;

  const result = addWatchlistItemSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 },
    );
  }

  const { recommendationId } = result.data;

  const [existing] = await db
    .select()
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.watchlistId, watchlistId),
        eq(watchlistItems.recommendationId, recommendationId),
      ),
    );

  if (existing) {
    return NextResponse.json(
      { error: "Esta recomendação já está nesta lista." },
      { status: 409 },
    );
  }

  const [item] = await db
    .insert(watchlistItems)
    .values({ watchlistId, recommendationId })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
