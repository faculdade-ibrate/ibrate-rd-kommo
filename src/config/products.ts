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
  clearCustomFields?: string[];
  customFieldNames?: string[];
};

export type IgnoredRoute = { ignoredReason: string };

const acceptedEvents = new Set([
  normalizeText("Formulário de Pré-matrícula"),
  normalizeText("pre-matricula"),
  normalizeText("whatsapp-site"),
  normalizeText("Pré inscrição cursos"),
  normalizeText("pre-inscricao-cursos"),
]);

const equilibraPreRegistrationEvents = new Set([
  normalizeText("Pré inscrição cursos"),
  normalizeText("pre-inscricao-cursos"),
]);

const agendaUnits = new Map<string, string>([
  [normalizeText("agenda-de-cursos-equilibra"), "Equilibra (CWB)"],
  [normalizeText("agenda-de-pos-em-curitiba"), "Curitiba"],
  [normalizeText("agenda-de-cursos-em-curitiba"), "Curitiba"],
  [normalizeText("agenda-de-cursos-em-balneario-camboriu"), "Balneário Camboriú"],
  [normalizeText("agenda-de-cursos-em-chapeco"), "Chapecó"],
  [normalizeText("agenda-de-cursos-em-cascavel"), "Cascavel"],
  [normalizeText("agenda-de-cursos-em-londrina"), "Londrina"],
]);

export function routeForConversion(conversion: ParsedRdConversion): ProductRoute | IgnoredRoute | undefined {
  const agendaUnit = agendaUnitFromEvent(conversion.eventIdentifier);
  const normalizedEvent = normalizeText(conversion.eventIdentifier);
  const isWhatsappSite = normalizedEvent === normalizeText("whatsapp-site");
  const isEquilibraPreRegistration = equilibraPreRegistrationEvents.has(normalizedEvent);
  if (!agendaUnit && !acceptedEvents.has(normalizedEvent)) return undefined;

  const unit = agendaUnit
    || (isEquilibraPreRegistration ? "Equilibra (Curitiba)" : undefined)
    || (isWhatsappSite
      ? customValue(conversion.customFields, "Unidade da sua escolha", "Unidade")
      : customValue(conversion.customFields, "Unidade"));
  const course = agendaUnit
    ? customValue(conversion.customFields, "Curso de interesse", "Curso", "Qual curso você está buscando?")
    : isEquilibraPreRegistration
      ? customValue(conversion.customFields, "Curso de Interesse", "Título da página")
    : isWhatsappSite
      ? customValue(conversion.customFields, "Qual curso você está buscando?", "Curso de interesse", "Curso")
      : customValue(conversion.customFields, "Curso", "Qual curso você está buscando?", "Curso de interesse");
  if (!unit) throw new Error("Pré-matrícula sem Unidade; não é possível escolher o funil.");
  const destination = destinationForUnit(unit);
  if (!destination) return { ignoredReason: `Unidade sem funil configurado: ${unit}` };
  const { pipelineName, stageName } = destination;

  return {
    product: isEquilibraPreRegistration
      ? "Pré-inscrição Equilibra"
      : isWhatsappSite
        ? "WhatsApp Site"
        : "Pré-matrícula",
    leadName: [course, unit].filter(Boolean).join(" | "),
    source: agendaUnit ? "Landing Page" : "Site",
    pipelineName,
    stageName,
    tags: agendaUnit
      ? ["Pré-matrícula", "Agenda de Cursos"]
      : isEquilibraPreRegistration
        ? ["RD", "Site", "Pré-inscrição", "Equilibra"]
      : isWhatsappSite
        ? ["RD", "Site", "WhatsApp"]
        : ["RD", "Site", "Pré-matrícula"],
    derivedCustomFields: agendaUnit || isWhatsappSite || isEquilibraPreRegistration
      ? { Curso: course, Unidade: unit }
      : undefined,
    clearCustomFields: agendaUnit || isWhatsappSite || isEquilibraPreRegistration
      ? ["Data do Curso"]
      : undefined,
    customFieldNames: agendaUnit
      ? ["Curso de interesse", "Formação"]
      : isEquilibraPreRegistration
        ? ["Curso de Interesse"]
        : isWhatsappSite
          ? ["Qual curso você está buscando?", "Unidade da sua escolha"]
          : ["Curso", "Unidade", "Data do Curso", "Formação"],
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
  if (["equilibra curitiba", "equilibra cwb"].includes(normalizedUnit)) {
    return {
      pipelineName: process.env.KOMMO_EQUILIBRA_PIPELINE_NAME || "Funil Equilibra",
      stageName: process.env.KOMMO_EQUILIBRA_ENTRY_STAGE_NAME || "NOVOS LEADS RD",
    };
  }
  return undefined;
}

export function isAgendaEvent(eventIdentifier: string): boolean {
  return Boolean(agendaUnitFromEvent(eventIdentifier));
}

function agendaUnitFromEvent(eventIdentifier: string): string | undefined {
  const normalizedEvent = normalizeText(eventIdentifier);
  const configuredUnit = agendaUnits.get(normalizedEvent);
  if (configuredUnit) return configuredUnit;

  const match = /^agenda de (?:cursos|pos) (?:em )?(.+)$/.exec(normalizedEvent);
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
