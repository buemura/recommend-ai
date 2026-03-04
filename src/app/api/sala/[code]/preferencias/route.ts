import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { rooms, roomMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  safeParseJson,
  roomPreferencesSchema,
  formatZodError,
  validateRoomCode,
} from "@/lib/validation";

export async function POST(
  req: Request,
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

  const { data, error } = await safeParseJson(req);
  if (error) return error;

  const result = roomPreferencesSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }
  const { activityType, filters } = result.data;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, code.toUpperCase()),
  });

  if (!room || room.status !== "waiting" || new Date() > room.expiresAt) {
    return NextResponse.json({ error: "Sala inválida." }, { status: 404 });
  }

  const membership = await db.query.roomMembers.findFirst({
    where: and(
      eq(roomMembers.roomId, room.id),
      eq(roomMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Não é membro desta sala." },
      { status: 403 }
    );
  }

  await db
    .update(roomMembers)
    .set({ activityType, filters: JSON.stringify(filters) })
    .where(
      and(
        eq(roomMembers.roomId, room.id),
        eq(roomMembers.userId, session.user.id)
      )
    );

  return NextResponse.json({ ok: true });
}
