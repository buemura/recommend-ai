import { db } from "@/db";
import { watchlists, watchlistItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ recommendationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { recommendationId } = await params;

  const userLists = await db
    .select()
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id))
    .orderBy(desc(watchlists.createdAt));

  const result = await Promise.all(
    userLists.map(async (list) => {
      const [item] = await db
        .select({ id: watchlistItems.id })
        .from(watchlistItems)
        .where(
          and(
            eq(watchlistItems.watchlistId, list.id),
            eq(watchlistItems.recommendationId, recommendationId),
          ),
        );
      return { ...list, contains: !!item, itemId: item?.id ?? null };
    }),
  );

  return NextResponse.json({ watchlists: result });
}
