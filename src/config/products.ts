import type { ParsedRdConversion } from "@/lib/rd";
import { normalizeText } from "@/lib/normalize";

export type Source = "Site" | "Landing Page" | "RD Station";

export type ProductRoute = {
  product: string;
  unit: string;
  leadName?: string;
  source: Source;
  pipelineName: string;
  stageName: string;
  tags: string[];
  derivedCustomFields?: Record<string, unknown>;
};

export type IgnoredRoute = { ignoredReason: string };

const acceptedEvents = new Set([
  normalizeText("Formulário de Pré-matrícula"),
  normalizeText("pre-matricula"),
]);

export function routeForConversion(conversion: ParsedRdConversion): ProductRoute | IgnoredRoute | undefined {
  const agendaUnit = agendaUnitFromEvent(conversion.eventIdentifier);
  if (!agendaUnit && !acceptedEvents.has(normalizeText(conversion.eventIdentifier))) return undefined;

  const unit = agendaUnit || customValue(conversion.customFields, "Unidade");
  const course = agendaUnit
    ? customValue(conversion.customFields, "Curso de interesse", "Curso", "Qual curso você está buscando?")
    : customValue(conversion.customFields, "Curso", "Qual curso você está buscando?", "Curso de interesse");
  if (!unit) throw new Error("Pré-matrícula sem Unidade; não é possível escolher o funil.");
  const destination = destinationForUnit(unit);
  if (!destination) return { ignoredReason: `Unidade sem funil configurado: ${unit}` };
  const { pipelineName, stageName } = destination;

  return {
    product: "Pré-matrícula",
    unit,
    leadName: ["Pré-matrícula", course, conversion.name].filter(Boolean).join(" | "),
    source: agendaUnit ? "Landing Page" : "Site",
    pipelineName,
    stageName,
    tags: agendaUnit
      ? ["Pré-matrícula", "Agenda de Cursos"]
      : ["RD", "Site", "Pré-matrícula"],
    derivedCustomFields: agendaUnit ? { Curso: course, Unidade: unit } : undefined,
  };
}

function destinationForUnit(unit: string): { pipelineName: string; stageName: string } | undefined {
  const normalizedUnit = normalizeText(unit);
  if (normalizedUnit === "curitiba") {
    return {
      pipelineName: process.env.KOMMO_CURITIBA_PIPELINE_NAME || "Funil Curitiba",
      stageName: process.env.KOMMO_CURITIBA_ENTRY_STAGE_NAME || "NOVOS LEADS RD",
    };
  }
  if (["chapeco", "balneario camboriu", "joinville"].includes(normalizedUnit)) {
    return {
      pipelineName: process.env.KOMMO_SANTA_CATARINA_PIPELINE_NAME || "Funil Santa Catarina",
      stageName: process.env.KOMMO_SANTA_CATARINA_ENTRY_STAGE_NAME || "NOVOS LEADS RD",
    };
  }
  if (["cascavel", "londrina"].includes(normalizedUnit)) {
    return {
      pipelineName: process.env.KOMMO_INTERIOR_PR_PIPELINE_NAME || "Funil Interior do PR",
      stageName: process.env.KOMMO_INTERIOR_PR_ENTRY_STAGE_NAME || "NOVOS LEADS RD",
    };
  }
  return undefined;
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
  for (const name of names) {
    const wanted = normalizeText(name);
    for (const [key, value] of Object.entries(fields)) {
      const cleanKey = key.replace(/^cf_/, "").replace(/_/g, " ");
      if (normalizeText(cleanKey) !== wanted) continue;
      const text = String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
      if (text) return text;
    }
  }
  return undefined;
}
