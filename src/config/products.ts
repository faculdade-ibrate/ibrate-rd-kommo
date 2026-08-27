import type { ParsedRdConversion } from "@/lib/rd";
import { normalizeText } from "@/lib/normalize";

export type Source = "Site" | "RD Station";

export type ProductRoute = {
  product: string;
  leadName?: string;
  source: Source;
  pipelineName: string;
  stageName: string;
  tags: string[];
};

const acceptedEvents = new Set([
  normalizeText("Formulário de Pré-matrícula"),
  normalizeText("pre-matricula"),
]);

export function routeForConversion(conversion: ParsedRdConversion): ProductRoute | undefined {
  if (!acceptedEvents.has(normalizeText(conversion.eventIdentifier))) return undefined;

  const unit = customValue(conversion.customFields, "Unidade");
  const course = customValue(conversion.customFields, "Curso");
  if (!unit) throw new Error("Pré-matrícula sem Unidade; não é possível escolher o funil.");
  const isCuritiba = normalizeText(unit) === "curitiba";
  const pipelineName = isCuritiba
    ? process.env.KOMMO_CURITIBA_PIPELINE_NAME || "Funil Curitiba"
    : process.env.KOMMO_FILIAIS_PIPELINE_NAME || "Funil Filiais";
  const stageName = isCuritiba
    ? process.env.KOMMO_CURITIBA_ENTRY_STAGE_NAME
    : process.env.KOMMO_FILIAIS_ENTRY_STAGE_NAME;

  return {
    product: "Pré-matrícula",
    leadName: ["Pré-matrícula", course, conversion.name].filter(Boolean).join(" | "),
    source: "Site",
    pipelineName,
    stageName: stageName || "",
    tags: ["RD", "Site", "Pré-matrícula"],
  };
}

function customValue(fields: Record<string, unknown>, name: string): string | undefined {
  const wanted = normalizeText(name);
  for (const [key, value] of Object.entries(fields)) {
    const cleanKey = key.replace(/^cf_/, "").replace(/_/g, " ");
    if (normalizeText(cleanKey) !== wanted) continue;
    const text = String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
    return text || undefined;
  }
  return undefined;
}
