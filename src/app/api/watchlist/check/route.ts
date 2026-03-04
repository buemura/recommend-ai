import { db } from "@/db";
import { watchlists, watchlistItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const recommendationId = searchParams.get("recommendationId");

  if (!recommendationId) {
    return NextResponse.json(
      { error: "recommendationId é obrigatório." },
      { status: 400 },
    );
  }

  const userLists = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id));

  if (userLists.length === 0) {
    return NextResponse.json({ watchlistIds: [] });
  }

  const listIds = userLists.map((l) => l.id);

  const containing = await db
    .select({ watchlistId: watchlistItems.watchlistId })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.recommendationId, recommendationId),
        inArray(watchlistItems.watchlistId, listIds),
      ),
    );

  return NextResponse.json({
    watchlistIds: containing.map((c) => c.watchlistId),
  });
}
