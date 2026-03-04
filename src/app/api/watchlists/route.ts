import { db } from "@/db";
import { watchlists } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createWatchlistSchema,
  formatZodError,
  safeParseJson,
} from "@/lib/validation";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const lists = await db
    .select()
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id))
    .orderBy(desc(watchlists.createdAt));

  return NextResponse.json({ watchlists: lists });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
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

  const [created] = await db
    .insert(watchlists)
    .values({ userId: session.user.id, name: result.data.name })
    .returning();

  return NextResponse.json({ watchlist: created }, { status: 201 });
}
