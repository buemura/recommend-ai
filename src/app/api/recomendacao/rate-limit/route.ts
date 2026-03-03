import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

const DAILY_LIMIT = 3;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayRecs = await db
    .select({ id: recommendations.id })
    .from(recommendations)
    .where(
      and(
        eq(recommendations.userId, session.user.id),
        gte(recommendations.createdAt, startOfDay)
      )
    );

  const used = todayRecs.length;

  return NextResponse.json({
    limit: DAILY_LIMIT,
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
  });
}
