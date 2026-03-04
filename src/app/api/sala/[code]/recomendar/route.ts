import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { rooms, roomMembers, recommendations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getGroupRecommendation } from "@/lib/ai";
import { fetchAnimeDetails } from "@/lib/mal";
import { fetchMediaDetails } from "@/lib/tmdb";
import { getTodayCount, getDailyLimit } from "@/lib/rate-limit";
import { validateRoomCode } from "@/lib/validation";
import type { ActivityType, Filters } from "@/types";

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
  if (room.creatorId !== session.user.id) {
    return NextResponse.json(
      { error: "Apenas o criador pode iniciar." },
      { status: 403 }
    );
  }

  // Atomically claim the room to prevent race conditions (double-click, multiple tabs)
  const [claimed] = await db
    .update(rooms)
    .set({ status: "done" })
    .where(and(eq(rooms.id, room.id), eq(rooms.status, "waiting")))
    .returning({ id: rooms.id });

  if (!claimed) {
    return NextResponse.json(
      { error: "Sala já processada." },
      { status: 409 }
    );
  }

  const members = await db.query.roomMembers.findMany({
    where: eq(roomMembers.roomId, room.id),
  });

  if (members.some((m) => !m.activityType)) {
    await db
      .update(rooms)
      .set({ status: "waiting" })
      .where(eq(rooms.id, room.id));
    return NextResponse.json(
      { error: "Nem todos os membros enviaram suas preferências." },
      { status: 422 }
    );
  }

  for (const member of members) {
    const memberLimit = await getDailyLimit(member.userId);
    const count = await getTodayCount(member.userId);
    if (count >= memberLimit) {
      await db
        .update(rooms)
        .set({ status: "waiting" })
        .where(eq(rooms.id, room.id));
      return NextResponse.json(
        {
          error:
            "Um ou mais membros atingiram o limite diário de recomendações.",
        },
        { status: 429 }
      );
    }
  }

  const memberPreferences = members.map((m) => ({
    activityType: m.activityType as ActivityType,
    filters: JSON.parse(m.filters || "{}") as Filters,
  }));

  let recommendation;
  try {
    recommendation = await getGroupRecommendation(memberPreferences);
  } catch (error: unknown) {
    // Revert room status on AI failure so creator can retry
    await db
      .update(rooms)
      .set({ status: "waiting" })
      .where(eq(rooms.id, room.id));
    const message = error instanceof Error ? error.message : "";
    if (message.includes("429")) {
      return NextResponse.json(
        { error: "IA temporariamente indisponível. Tente em instantes." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao gerar recomendação." },
      { status: 500 }
    );
  }

  // Enrich with external data: MAL for anime, TMDB for movies/TV
  const tmdbDetails =
    recommendation.activityType === "anime"
      ? await fetchAnimeDetails(recommendation.title)
      : await fetchMediaDetails(recommendation.title, recommendation.activityType);

  const insertedIds: string[] = [];
  for (const member of members) {
    const [saved] = await db
      .insert(recommendations)
      .values({
        userId: member.userId,
        activityType: recommendation.activityType,
        title: tmdbDetails?.title || recommendation.title,
        description: tmdbDetails?.description || recommendation.description,
        genre: tmdbDetails?.genre || recommendation.genre,
        releaseYear: tmdbDetails?.releaseYear || recommendation.releaseYear,
        rating: tmdbDetails?.rating || recommendation.rating,
        seasons: tmdbDetails?.seasons || recommendation.seasons,
        episodes: tmdbDetails?.episodes || recommendation.episodes,
        artist: recommendation.artist,
        language: recommendation.language,
        imageUrl: tmdbDetails?.imageUrl || null,
      })
      .returning();
    insertedIds.push(saved.id);
  }

  const creatorIndex = members.findIndex(
    (m) => m.userId === room.creatorId
  );
  const creatorRecId = insertedIds[creatorIndex] || insertedIds[0];

  await db
    .update(rooms)
    .set({ recommendationId: creatorRecId })
    .where(eq(rooms.id, room.id));

  return NextResponse.json({ ok: true });
}
