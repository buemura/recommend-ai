import { db } from "@/db";
import { likes, recommendations, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    20,
    Math.max(1, Number(searchParams.get("limit")) || 10)
  );
  const offset = (page - 1) * limit;
  const type = searchParams.get("type");

  const conditions = [];
  if (type) conditions.push(eq(recommendations.activityType, type));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Subquery for likes count
  const likesCountSq = db
    .select({
      recommendationId: likes.recommendationId,
      likesCount: count().as("likes_count"),
    })
    .from(likes)
    .groupBy(likes.recommendationId)
    .as("likes_count_sq");

  // Subquery for whether current user liked
  const userLikeSq = db
    .select({
      recommendationId: likes.recommendationId,
      liked: sql<boolean>`true`.as("liked"),
    })
    .from(likes)
    .where(eq(likes.userId, session.user.id))
    .as("user_like_sq");

  const [feed, [{ total }]] = await Promise.all([
    db
      .select({
        id: recommendations.id,
        activityType: recommendations.activityType,
        title: recommendations.title,
        description: recommendations.description,
        genre: recommendations.genre,
        releaseYear: recommendations.releaseYear,
        rating: recommendations.rating,
        seasons: recommendations.seasons,
        episodes: recommendations.episodes,
        artist: recommendations.artist,
        language: recommendations.language,
        imageUrl: recommendations.imageUrl,
        createdAt: recommendations.createdAt,
        authorName: users.name,
        authorImage: users.image,
        likesCount: sql<number>`coalesce(${likesCountSq.likesCount}, 0)`.mapWith(Number),
        isLiked: sql<boolean>`coalesce(${userLikeSq.liked}, false)`,
      })
      .from(recommendations)
      .innerJoin(users, eq(recommendations.userId, users.id))
      .leftJoin(
        likesCountSq,
        eq(recommendations.id, likesCountSq.recommendationId)
      )
      .leftJoin(
        userLikeSq,
        eq(recommendations.id, userLikeSq.recommendationId)
      )
      .where(whereClause)
      .orderBy(desc(recommendations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(recommendations)
      .where(whereClause),
  ]);

  return NextResponse.json({ feed, total, page, limit });
}
