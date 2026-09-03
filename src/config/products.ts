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
  normalizeText("Pré inscrição Equilibra"),
  normalizeText("pre-inscricao-equilibra"),
  normalizeText("Contato Equiliba"),
  normalizeText("Contato Equilibra"),
  normalizeText("contato-equilibra"),
  normalizeText("whatsapp-site-equilibra"),
]);

const equilibraPreRegistrationEvents = new Set([
  normalizeText("Pré inscrição cursos"),
  normalizeText("pre-inscricao-cursos"),
]);

const equilibraMessageFormEvents = new Set([
  normalizeText("Pré inscrição Equilibra"),
  normalizeText("pre-inscricao-equilibra"),
  normalizeText("Contato Equiliba"),
  normalizeText("Contato Equilibra"),
  normalizeText("contato-equilibra"),
]);

const equilibraGeneralPreRegistrationEvents = new Set([
  normalizeText("Pré inscrição Equilibra"),
  normalizeText("pre-inscricao-equilibra"),
]);

const equilibraWhatsappEvents = new Set([
  normalizeText("whatsapp-site-equilibra"),
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

const courseLandingPages = new Map<string, string>([
  [
    normalizeText("pos-fisioterapia-dermatofuncional"),
    "Pós-Graduação em Fisioterapia Dermatofuncional",
  ],
  [
    normalizeText("pos-reabilitacao-neurofuncional-pediatrica"),
    "Pós-Graduação em Reabilitação Neurofuncional Pediátrica",
  ],
]);

export function routeForConversion(conversion: ParsedRdConversion): ProductRoute | IgnoredRoute | undefined {
  const agendaUnit = agendaUnitFromEvent(conversion.eventIdentifier);
  const normalizedEvent = normalizeText(conversion.eventIdentifier);
  const landingPageCourse = courseLandingPages.get(normalizedEvent);
  const isWhatsappSite = normalizedEvent === normalizeText("whatsapp-site");
  const isEquilibraPreRegistration = equilibraPreRegistrationEvents.has(normalizedEvent);
  const isEquilibraMessageForm = equilibraMessageFormEvents.has(normalizedEvent);
  const isEquilibraGeneralPreRegistration = equilibraGeneralPreRegistrationEvents.has(normalizedEvent);
  const isEquilibraWhatsapp = equilibraWhatsappEvents.has(normalizedEvent);
  if (!agendaUnit && !landingPageCourse && !acceptedEvents.has(normalizedEvent)) return undefined;

  const unit = agendaUnit
    || (isEquilibraPreRegistration || isEquilibraMessageForm || isEquilibraWhatsapp
      ? "Equilibra (Curitiba)"
      : undefined)
    || (isWhatsappSite || landingPageCourse
      ? customValue(conversion.customFields, "Unidade da sua escolha", "Unidade")
      : customValue(conversion.customFields, "Unidade"));
  const course = landingPageCourse || (agendaUnit
    ? customValue(conversion.customFields, "Curso de interesse", "Curso", "Qual curso você está buscando?")
    : isEquilibraPreRegistration
      ? customValue(conversion.customFields, "Curso de Interesse", "Título da página")
      : isEquilibraMessageForm
        ? undefined
        : isEquilibraWhatsapp
          ? customValue(conversion.customFields, "Qual curso você está buscando?", "Curso de interesse", "Curso")
        : isWhatsappSite
          ? customValue(conversion.customFields, "Qual curso você está buscando?", "Curso de interesse", "Curso")
          : customValue(conversion.customFields, "Curso", "Qual curso você está buscando?", "Curso de interesse"));
  const leadSubject = course
    || (isEquilibraGeneralPreRegistration ? "Pré-inscrição Equilibra" : undefined)
    || (isEquilibraMessageForm ? "Contato Equilibra" : undefined);
  if (!unit) throw new Error("Pré-matrícula sem Unidade; não é possível escolher o funil.");
  const destination = destinationForUnit(unit);
  if (!destination) return { ignoredReason: `Unidade sem funil configurado: ${unit}` };
  const { pipelineName, stageName } = destination;

  return {
    product: landingPageCourse
      ? "Pré-inscrição"
      : isEquilibraPreRegistration || isEquilibraGeneralPreRegistration
      ? "Pré-inscrição Equilibra"
      : isEquilibraMessageForm
        ? "Contato Equilibra"
      : isEquilibraWhatsapp
        ? "WhatsApp Equilibra"
      : isWhatsappSite
        ? "WhatsApp Site"
        : "Pré-matrícula",
    leadName: [leadSubject, unit].filter(Boolean).join(" | "),
    source: agendaUnit || landingPageCourse ? "Landing Page" : "Site",
    pipelineName,
    stageName,
    tags: agendaUnit
      ? ["Pré-matrícula", "Agenda de Cursos"]
      : landingPageCourse
        ? ["Site", "Pré-inscrição", "LP"]
      : isEquilibraPreRegistration || isEquilibraGeneralPreRegistration
        ? ["Site", "Pré-inscrição", "Equilibra"]
      : isEquilibraMessageForm
        ? ["Site", "Contato", "Equilibra"]
      : isEquilibraWhatsapp
        ? ["Site", "WhatsApp", "Equilibra"]
      : isWhatsappSite
        ? ["Site", "WhatsApp"]
        : ["Site", "Pré-matrícula"],
    derivedCustomFields: agendaUnit || landingPageCourse || isWhatsappSite || isEquilibraPreRegistration || isEquilibraMessageForm || isEquilibraWhatsapp
      ? { Curso: course, Unidade: unit }
      : undefined,
    clearCustomFields: agendaUnit || landingPageCourse || isWhatsappSite || isEquilibraPreRegistration || isEquilibraMessageForm || isEquilibraWhatsapp
      ? ["Data do Curso"]
      : undefined,
    customFieldNames: agendaUnit
      ? ["Curso de interesse", "Formação"]
      : landingPageCourse
        ? ["Unidade da sua escolha", "Formação"]
      : isEquilibraPreRegistration
        ? ["Curso de Interesse", "Formação"]
        : isEquilibraMessageForm
          ? ["Mensagem", "Formação"]
        : isEquilibraWhatsapp
          ? ["Qual curso você está buscando?", "Formação"]
        : isWhatsappSite
          ? ["Qual curso você está buscando?", "Unidade da sua escolha", "Formação"]
          : ["Curso", "Unidade", "Data do Curso", "Formação"],
  };
}

function destinationForUnit(unit: string): { pipelineName: string; stageName: string } | undefined {
  const normalizedUnit = normalizeText(unit);
  if (["curitiba", "ibrate curitiba"].includes(normalizedUnit)) {
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

export function isEquilibraEvent(eventIdentifier: string): boolean {
  const normalizedEvent = normalizeText(eventIdentifier);
  return equilibraMessageFormEvents.has(normalizedEvent)
    || equilibraWhatsappEvents.has(normalizedEvent);
}

export function isCourseLandingPageEvent(eventIdentifier: string): boolean {
  return courseLandingPages.has(normalizeText(eventIdentifier));
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
