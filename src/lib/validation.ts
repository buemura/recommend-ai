import * as z from "zod";
import { NextResponse } from "next/server";

const CURRENT_YEAR = new Date().getFullYear();

// --- Schemas ---

export const registerSchema = z.object({
  name: z
    .string({ error: "Nome é obrigatório." })
    .min(1, "Nome é obrigatório.")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  email: z
    .string({ error: "Formato de email inválido." })
    .email("Formato de email inválido.")
    .max(255, "Email muito longo."),
  password: z
    .string({ error: "A senha deve ter pelo menos 6 caracteres." })
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(128, "Senha muito longa (máximo 128 caracteres)."),
});

export const activityTypeSchema = z.enum(
  ["movie", "tv_show", "anime", "music", "random"],
  { error: "Tipo de atividade inválido." }
);

export const roomActivityTypeSchema = z.enum(
  ["movie", "tv_show", "anime", "music"],
  { error: "Tipo de atividade inválido." }
);

export const filtersSchema = z
  .object({
    genre: z.string().max(50, "Gênero muito longo.").optional(),
    yearMin: z.number().int().min(1888).max(CURRENT_YEAR + 5).optional(),
    yearMax: z.number().int().min(1888).max(CURRENT_YEAR + 5).optional(),
    ratingMin: z.number().min(0).max(10).optional(),
    ratingMax: z.number().min(0).max(10).optional(),
    seasonsMin: z.number().int().min(1).max(100).optional(),
    seasonsMax: z.number().int().min(1).max(100).optional(),
    episodesMin: z.number().int().min(1).max(10000).optional(),
    episodesMax: z.number().int().min(1).max(10000).optional(),
    language: z.string().max(50, "Idioma muito longo.").optional(),
  })
  .optional()
  .default({});

export const recommendationSchema = z.object({
  activityType: activityTypeSchema,
  filters: filtersSchema,
});

export const roomPreferencesSchema = z.object({
  activityType: roomActivityTypeSchema,
  filters: filtersSchema,
});

export const roomCodeSchema = z
  .string({ error: "Código da sala inválido." })
  .regex(/^[A-Z0-9]{6}$/i, "Código da sala deve ter 6 caracteres alfanuméricos.");

// --- Helpers ---

export async function safeParseJson(
  request: Request
): Promise<{ data?: unknown; error?: NextResponse }> {
  try {
    const body = await request.json();
    if (body === null || body === undefined || typeof body !== "object") {
      return {
        error: NextResponse.json(
          { error: "Corpo da requisição inválido." },
          { status: 400 }
        ),
      };
    }
    return { data: body };
  } catch {
    return {
      error: NextResponse.json(
        { error: "JSON malformado na requisição." },
        { status: 400 }
      ),
    };
  }
}

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "Dados inválidos.";
}

export function validateRoomCode(code: string): string | null {
  const result = roomCodeSchema.safeParse(code);
  if (!result.success) {
    return formatZodError(result.error);
  }
  return null;
}
