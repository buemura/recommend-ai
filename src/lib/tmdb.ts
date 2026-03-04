import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { tmdbCache } from "@/db/schema";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_TIMEOUT_MS = 10_000;

const headers = {
  Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};

export interface TmdbMediaDetails {
  title: string;
  description: string;
  genre: string | null;
  releaseYear: number | null;
  rating: number | null;
  seasons: number | null;
  episodes: number | null;
  imageUrl: string | null;
}

interface TmdbSearchResult {
  id: number;
  poster_path: string | null;
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[];
}

interface TmdbMovieDetails {
  title: string;
  overview: string;
  genres: { id: number; name: string }[];
  release_date: string;
  vote_average: number;
  poster_path: string | null;
}

interface TmdbTvDetails {
  name: string;
  overview: string;
  genres: { id: number; name: string }[];
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
  poster_path: string | null;
}

export async function fetchMediaDetails(
  title: string,
  activityType: string
): Promise<TmdbMediaDetails | null> {
  if (activityType === "music") return null;

  const normalizedTitle = title.toLowerCase().trim();

  try {
    const cached = await db
      .select()
      .from(tmdbCache)
      .where(
        and(
          eq(tmdbCache.title, normalizedTitle),
          eq(tmdbCache.activityType, activityType)
        )
      )
      .then((rows) => rows[0]);

    if (cached) {
      return {
        title: cached.tmdbTitle,
        description: cached.description,
        genre: cached.genre,
        releaseYear: cached.releaseYear,
        rating: cached.rating,
        seasons: cached.seasons,
        episodes: cached.episodes,
        imageUrl: cached.imageUrl,
      };
    }

    const isMovie = activityType === "movie";
    const searchEndpoint = isMovie ? "/search/movie" : "/search/tv";
    const searchUrl = `${TMDB_BASE_URL}${searchEndpoint}?query=${encodeURIComponent(title)}&language=pt-BR`;

    const searchRes = await fetch(searchUrl, {
      headers,
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    });
    if (!searchRes.ok) return null;

    const searchData: TmdbSearchResponse = await searchRes.json();
    const firstResult = searchData.results?.[0];
    if (!firstResult) return null;

    const detailEndpoint = isMovie
      ? `/movie/${firstResult.id}`
      : `/tv/${firstResult.id}`;
    const detailUrl = `${TMDB_BASE_URL}${detailEndpoint}?language=pt-BR`;

    const detailRes = await fetch(detailUrl, {
      headers,
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    });
    if (!detailRes.ok) return null;

    let details: TmdbMediaDetails;

    if (isMovie) {
      const movie: TmdbMovieDetails = await detailRes.json();
      details = {
        title: movie.title,
        description: movie.overview || "Sem descrição disponível.",
        genre: movie.genres?.[0]?.name || null,
        releaseYear: movie.release_date
          ? parseInt(movie.release_date.substring(0, 4))
          : null,
        rating: movie.vote_average
          ? Math.round(movie.vote_average * 10) / 10
          : null,
        seasons: null,
        episodes: null,
        imageUrl: movie.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
          : null,
      };
    } else {
      const tv: TmdbTvDetails = await detailRes.json();
      details = {
        title: tv.name,
        description: tv.overview || "Sem descrição disponível.",
        genre: tv.genres?.[0]?.name || null,
        releaseYear: tv.first_air_date
          ? parseInt(tv.first_air_date.substring(0, 4))
          : null,
        rating: tv.vote_average
          ? Math.round(tv.vote_average * 10) / 10
          : null,
        seasons: tv.number_of_seasons || null,
        episodes: tv.number_of_episodes || null,
        imageUrl: tv.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${tv.poster_path}`
          : null,
      };
    }

    await db.insert(tmdbCache).values({
      title: normalizedTitle,
      activityType,
      tmdbTitle: details.title,
      description: details.description,
      genre: details.genre,
      releaseYear: details.releaseYear,
      rating: details.rating,
      seasons: details.seasons,
      episodes: details.episodes,
      imageUrl: details.imageUrl,
    });

    return details;
  } catch {
    return null;
  }
}
