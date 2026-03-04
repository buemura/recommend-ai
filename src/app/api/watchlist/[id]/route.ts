import { db } from "@/db";
import { watchlists, watchlistItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id: itemId } = await params;

  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, itemId),
    with: { watchlist: true },
  });

  if (!item || item.watchlist.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Item não encontrado." },
      { status: 404 },
    );
  }

  await db.delete(watchlistItems).where(eq(watchlistItems.id, itemId));

  return NextResponse.json({ ok: true });
}
