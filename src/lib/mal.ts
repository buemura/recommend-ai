import { eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { malCache } from "@/db/schema";
import type { TmdbMediaDetails } from "@/lib/tmdb";

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const JIKAN_TIMEOUT_MS = 10_000;

interface JikanAnimeData {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      large_image_url: string | null;
    };
  };
  title: string;
  title_english: string | null;
  episodes: number | null;
  score: number | null;
  synopsis: string | null;
  year: number | null;
  aired: {
    prop: {
      from: { year: number | null };
    };
  };
  genres: { name: string }[];
  studios: { name: string }[];
}

interface JikanSearchResponse {
  data: JikanAnimeData[];
}

export async function searchAnime(query: string): Promise<TmdbMediaDetails[]> {
  const normalizedQuery = query.toLowerCase().trim();

  try {
    // 1. Check DB cache first
    const cached = await db
      .select()
      .from(malCache)
      .where(
        or(
          ilike(malCache.title, `%${normalizedQuery}%`),
          ilike(malCache.malTitle, `%${normalizedQuery}%`),
          ilike(malCache.englishTitle, `%${normalizedQuery}%`),
        ),
      )
      .limit(10);

    const dbResults: TmdbMediaDetails[] = cached.map((c) => ({
      title: c.malTitle,
      description: c.description,
      genre: c.genre,
      releaseYear: c.releaseYear,
      rating: c.rating,
      seasons: null,
      episodes: c.episodes,
      imageUrl: c.imageUrl,
    }));

    if (dbResults.length >= 5) return dbResults;

    // 2. Search Jikan API
    const searchUrl = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=10`;
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(JIKAN_TIMEOUT_MS),
    });
    if (!searchRes.ok) return dbResults;

    const searchData: JikanSearchResponse = await searchRes.json();
    const apiResults: TmdbMediaDetails[] = [];

    for (const anime of searchData.data) {
      const releaseYear = anime.year ?? anime.aired?.prop?.from?.year ?? null;
      const genre = anime.genres?.[0]?.name ?? null;
      const studios = anime.studios?.map((s) => s.name).join(", ") || null;
      const rating = anime.score ? Math.round(anime.score * 10) / 10 : null;

      const details: TmdbMediaDetails = {
        title: anime.title,
        description: anime.synopsis || "Sem descrição disponível.",
        genre,
        releaseYear,
        rating,
        seasons: null,
        episodes: anime.episodes,
        imageUrl: anime.images?.jpg?.large_image_url || null,
      };

      // Cache the result only if not already in DB
      const detailNormalized = details.title.toLowerCase().trim();
      const existing = await db
        .select({ id: malCache.id })
        .from(malCache)
        .where(eq(malCache.title, detailNormalized))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(malCache).values({
          title: detailNormalized,
          malTitle: details.title,
          englishTitle: anime.title_english || null,
          description: details.description,
          genre: details.genre,
          releaseYear: details.releaseYear,
          rating: details.rating,
          episodes: details.episodes,
          imageUrl: details.imageUrl,
          malUrl: anime.url || null,
          studios,
        });
      }

      apiResults.push(details);
    }

    // Deduplicate by title
    const seen = new Set(dbResults.map((r) => r.title.toLowerCase()));
    const combined = [...dbResults];
    for (const r of apiResults) {
      const key = r.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(r);
      }
    }

    return combined.slice(0, 10);
  } catch {
    return [];
  }
}

export async function fetchAnimeDetails(
  title: string,
): Promise<TmdbMediaDetails | null> {
  const normalizedTitle = title.toLowerCase().trim();

  try {
    const cached = await db
      .select()
      .from(malCache)
      .where(eq(malCache.title, normalizedTitle))
      .then((rows) => rows[0]);

    if (cached) {
      return {
        title: cached.malTitle,
        description: cached.description,
        genre: cached.genre,
        releaseYear: cached.releaseYear,
        rating: cached.rating,
        seasons: null,
        episodes: cached.episodes,
        imageUrl: cached.imageUrl,
      };
    }

    const searchUrl = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(title)}&limit=1`;
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(JIKAN_TIMEOUT_MS),
    });
    if (!searchRes.ok) return null;

    const searchData: JikanSearchResponse = await searchRes.json();
    const anime = searchData.data?.[0];
    if (!anime) return null;

    const releaseYear = anime.year ?? anime.aired?.prop?.from?.year ?? null;
    const genre = anime.genres?.[0]?.name ?? null;
    const studios = anime.studios?.map((s) => s.name).join(", ") || null;
    const rating = anime.score ? Math.round(anime.score * 10) / 10 : null;

    const details: TmdbMediaDetails = {
      title: anime.title,
      description: anime.synopsis || "Sem descrição disponível.",
      genre,
      releaseYear,
      rating,
      seasons: null,
      episodes: anime.episodes,
      imageUrl: anime.images?.jpg?.large_image_url || null,
    };

    await db.insert(malCache).values({
      title: normalizedTitle,
      malTitle: details.title,
      englishTitle: anime.title_english || null,
      description: details.description,
      genre: details.genre,
      releaseYear: details.releaseYear,
      rating: details.rating,
      episodes: details.episodes,
      imageUrl: details.imageUrl,
      malUrl: anime.url || null,
      studios,
    });

    return details;
  } catch {
    return null;
  }
}
