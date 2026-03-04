import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type {
  ActivityType,
  Filters,
  MovieTvFilters,
  MusicFilters,
} from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const AI_TIMEOUT_MS = 30_000;

function buildPrompt(
  activityType: ActivityType,
  filters: Filters,
  previousTitles: string[]
): string {
  const previousList =
    previousTitles.length > 0
      ? `\n\nNÃO recomende nenhum destes títulos já recomendados anteriormente: ${previousTitles.join(", ")}`
      : "";

  const baseInstruction =
    "Você é um assistente especializado em recomendar entretenimento. Retorne EXATAMENTE um JSON válido (sem markdown, sem blocos de código) com os campos especificados.";

  if (
    activityType === "movie" ||
    activityType === "tv_show" ||
    activityType === "anime"
  ) {
    const f = filters as MovieTvFilters;
    const type =
      activityType === "movie"
        ? "filme"
        : activityType === "tv_show"
          ? "série de TV"
          : "anime";

    const filterParts: string[] = [];
    if (f.genre) filterParts.push(`gênero: ${f.genre}`);
    if (f.yearMin || f.yearMax)
      filterParts.push(
        `ano de lançamento: ${f.yearMin || "qualquer"} a ${f.yearMax || "atual"}`
      );
    if (f.ratingMin || f.ratingMax)
      filterParts.push(`nota: ${f.ratingMin || 0} a ${f.ratingMax || 10}`);
    if (f.seasonsMin || f.seasonsMax)
      filterParts.push(
        `temporadas: ${f.seasonsMin || 1} a ${f.seasonsMax || "qualquer"}`
      );
    if (f.episodesMin || f.episodesMax)
      filterParts.push(
        `episódios: ${f.episodesMin || 1} a ${f.episodesMax || "qualquer"}`
      );

    const filtersText =
      filterParts.length > 0
        ? `Preferências: ${filterParts.join(", ")}.`
        : "Sem preferências específicas, sugira algo popular e bem avaliado.";

    return `${baseInstruction}

Recomende um ${type}. ${filtersText}${previousList}

Retorne este JSON exato:
{"title": "nome original do título"}`;
  }

  if (activityType === "music") {
    const f = filters as MusicFilters;
    const filterParts: string[] = [];
    if (f.genre) filterParts.push(`gênero: ${f.genre}`);
    if (f.yearMin || f.yearMax)
      filterParts.push(
        `ano: ${f.yearMin || "qualquer"} a ${f.yearMax || "atual"}`
      );
    if (f.language) filterParts.push(`idioma: ${f.language}`);

    const filtersText =
      filterParts.length > 0
        ? `Preferências: ${filterParts.join(", ")}.`
        : "Sem preferências específicas, sugira algo popular.";

    return `${baseInstruction}

Recomende uma música. ${filtersText}${previousList}

Retorne este JSON exato:
{"title": "nome da música", "description": "sobre a música em 2-3 frases em português", "genre": "gênero", "releaseYear": 2024, "artist": "artista/banda", "language": "idioma"}`;
  }

  return baseInstruction;
}

function parseJsonResponse(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Não foi possível processar a resposta da IA.");
  }
  return JSON.parse(jsonMatch[0]);
}

async function generateWithGemini(prompt: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {},
  }, { timeout: AI_TIMEOUT_MS });
  return result.response.text();
}

async function generateWithOpenAI(prompt: string) {
  const response = await openai.chat.completions.create(
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: AI_TIMEOUT_MS }
  );
  return response.choices[0].message.content || "";
}

export async function getRecommendation(
  activityType: ActivityType,
  filters: Filters,
  previousTitles: string[]
) {
  const prompt = buildPrompt(activityType, filters, previousTitles);

  // Try Gemini first, fall back to OpenAI
  try {
    const text = await generateWithGemini(prompt);
    return parseJsonResponse(text);
  } catch (geminiError) {
    console.warn("Gemini failed, falling back to OpenAI:", geminiError);
  }

  const text = await generateWithOpenAI(prompt);
  return parseJsonResponse(text);
}

export interface MemberPreference {
  activityType: ActivityType;
  filters: Filters;
}

function buildGroupPrompt(preferences: MemberPreference[]): string {
  const baseInstruction =
    "Você é um assistente especializado em recomendar entretenimento para grupos. Retorne EXATAMENTE um JSON válido (sem markdown, sem blocos de código) com os campos especificados.";

  const typeLabels: Record<string, string> = {
    movie: "filme",
    tv_show: "série de TV",
    anime: "anime",
    music: "música",
  };

  const memberLines = preferences.map((p, i) => {
    const filterEntries = Object.entries(p.filters).filter(
      ([, v]) => v !== undefined && v !== ""
    );
    const filterText =
      filterEntries.length > 0
        ? filterEntries.map(([k, v]) => `${k}: ${v}`).join(", ")
        : "sem filtros específicos";
    return `Membro ${i + 1}: quer ${typeLabels[p.activityType] || p.activityType}, filtros: ${filterText}`;
  });

  const types = [...new Set(preferences.map((p) => p.activityType))];
  const typeInstruction =
    types.length === 1
      ? `Todos querem: ${typeLabels[types[0]] || types[0]}.`
      : `Os membros têm preferências mistas. Escolha o tipo mais popular entre: ${types.map((t) => typeLabels[t] || t).join(", ")}.`;

  return `${baseInstruction}

Você deve recomendar UMA opção que agrade ao grupo como um todo. Encontre o melhor denominador comum entre as preferências individuais.

${typeInstruction}

Preferências individuais dos membros:
${memberLines.join("\n")}

Se o tipo escolhido for música, retorne este JSON:
{"activityType": "music", "title": "nome da música", "description": "por que agrada ao grupo em 2-3 frases em português", "genre": "gênero", "releaseYear": 2024, "artist": "artista/banda", "language": "idioma"}

Caso contrário (filme, série, anime), retorne este JSON:
{"activityType": "movie|tv_show|anime", "title": "nome original do título"}`;
}

export async function getGroupRecommendation(
  preferences: MemberPreference[]
) {
  const prompt = buildGroupPrompt(preferences);

  try {
    const text = await generateWithGemini(prompt);
    return parseJsonResponse(text);
  } catch (geminiError) {
    console.warn("Gemini failed, falling back to OpenAI:", geminiError);
  }

  const text = await generateWithOpenAI(prompt);
  return parseJsonResponse(text);
}
