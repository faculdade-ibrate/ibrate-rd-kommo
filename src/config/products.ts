import type { ParsedRdConversion } from "@/lib/rd";
import { normalizeText } from "@/lib/normalize";

export type Source = "Site" | "Landing Page" | "RD Station";

export type ProductRoute = {
  product: string;
  leadName?: string;
  source: Source;
  pipelineName: string;
  stageName: string;
  tags: string[];
  derivedCustomFields?: Record<string, unknown>;
};

const acceptedEvents = new Set([
  normalizeText("Formulário de Pré-matrícula"),
  normalizeText("pre-matricula"),
]);

export function routeForConversion(conversion: ParsedRdConversion): ProductRoute | undefined {
  const agendaUnit = agendaUnitFromEvent(conversion.eventIdentifier);
  if (!agendaUnit && !acceptedEvents.has(normalizeText(conversion.eventIdentifier))) return undefined;

  const unit = agendaUnit || customValue(conversion.customFields, "Unidade");
  const course = agendaUnit
    ? customValue(conversion.customFields, "Curso de interesse", "Curso", "Qual curso você está buscando?")
    : customValue(conversion.customFields, "Curso", "Qual curso você está buscando?", "Curso de interesse");
  if (!unit) throw new Error("Pré-matrícula sem Unidade; não é possível escolher o funil.");
  const isCuritiba = normalizeText(unit) === "curitiba";
  const pipelineName = isCuritiba
    ? process.env.KOMMO_CURITIBA_PIPELINE_NAME || "Funil Curitiba"
    : process.env.KOMMO_FILIAIS_PIPELINE_NAME || "Funil Filiais";
  const stageName = isCuritiba
    ? process.env.KOMMO_CURITIBA_ENTRY_STAGE_NAME || "NOVOS LEADS RD"
    : process.env.KOMMO_FILIAIS_ENTRY_STAGE_NAME || "NOVOS LEADS RD";

  return {
    product: "Pré-matrícula",
    leadName: ["Pré-matrícula", course, conversion.name].filter(Boolean).join(" | "),
    source: agendaUnit ? "Landing Page" : "Site",
    pipelineName,
    stageName,
    tags: agendaUnit
      ? ["RD", "Landing Page", "Agenda de Cursos", "Pré-matrícula"]
      : ["RD", "Site", "Pré-matrícula"],
    derivedCustomFields: agendaUnit ? { Curso: course, Unidade: unit } : undefined,
  };
}

export function isAgendaEvent(eventIdentifier: string): boolean {
  return Boolean(agendaUnitFromEvent(eventIdentifier));
}

function agendaUnitFromEvent(eventIdentifier: string): string | undefined {
  const match = /^agenda de cursos (?:em )?(.+)$/.exec(normalizeText(eventIdentifier));
  if (!match) return undefined;
  const smallWords = new Set(["da", "das", "de", "do", "dos", "e"]);
  return match[1]
    .split(" ")
    .map((word, index) => index > 0 && smallWords.has(word) ? word : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function customValue(fields: Record<string, unknown>, ...names: string[]): string | undefined {
  const wanted = new Set(names.map(normalizeText));
  for (const [key, value] of Object.entries(fields)) {
    const cleanKey = key.replace(/^cf_/, "").replace(/_/g, " ");
    if (!wanted.has(normalizeText(cleanKey))) continue;
    const text = String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
    return text || undefined;
  }
  return undefined;
}
