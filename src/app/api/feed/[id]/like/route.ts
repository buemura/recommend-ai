import { db } from "@/db";
import { likes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id: recommendationId } = await params;

  // Check if already liked
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(
      and(
        eq(likes.userId, session.user.id),
        eq(likes.recommendationId, recommendationId)
      )
    )
    .limit(1);

  if (existing) {
    // Unlike
    await db.delete(likes).where(eq(likes.id, existing.id));
  } else {
    // Like
    await db.insert(likes).values({
      userId: session.user.id,
      recommendationId,
    });
  }

  // Return updated count
  const [{ likesCount }] = await db
    .select({ likesCount: count() })
    .from(likes)
    .where(eq(likes.recommendationId, recommendationId));

  return NextResponse.json({
    liked: !existing,
    likesCount,
  });
}
