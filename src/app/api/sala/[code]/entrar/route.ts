import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { rooms, roomMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateRoomCode } from "@/lib/validation";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { code } = await params;
  const codeError = validateRoomCode(code);
  if (codeError) {
    return NextResponse.json({ error: codeError }, { status: 400 });
  }

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, code.toUpperCase()),
  });

  if (!room) {
    return NextResponse.json(
      { error: "Sala não encontrada." },
      { status: 404 }
    );
  }
  if (room.status !== "waiting") {
    return NextResponse.json(
      { error: "Sala já encerrada." },
      { status: 409 }
    );
  }
  if (new Date() > room.expiresAt) {
    return NextResponse.json({ error: "Código expirado." }, { status: 410 });
  }

  await db
    .insert(roomMembers)
    .values({ roomId: room.id, userId: session.user.id })
    .onConflictDoNothing();

  return NextResponse.json({ roomId: room.id, code: room.code });
}
