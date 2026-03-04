import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { rooms, roomMembers, users, recommendations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateRoomCode } from "@/lib/validation";

export async function GET(
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

  const members = await db
    .select({
      userId: roomMembers.userId,
      userName: users.name,
      activityType: roomMembers.activityType,
    })
    .from(roomMembers)
    .innerJoin(users, eq(users.id, roomMembers.userId))
    .where(eq(roomMembers.roomId, room.id));

  const userId = session.user.id!;
  const isMember = members.some((m) => m.userId === userId);
  if (!isMember) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let recommendation = null;
  if (room.status === "done" && room.recommendationId) {
    recommendation = await db.query.recommendations.findFirst({
      where: eq(recommendations.id, room.recommendationId),
    });
  }

  const currentUser = members.find((m) => m.userId === userId);

  return NextResponse.json({
    status: room.status,
    code: room.code,
    isCreator: room.creatorId === userId,
    currentUserSubmitted: currentUser?.activityType !== null,
    members: members.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      hasSubmitted: m.activityType !== null,
    })),
    allSubmitted: members.every((m) => m.activityType !== null),
    recommendation,
  });
}
