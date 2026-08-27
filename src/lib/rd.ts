import { normalizeBrazilPhone, normalizeEmail } from "@/lib/normalize";

export type RdWebhook = {
  event_type?: string;
  entity_type?: string;
  event_identifier?: string;
  timestamp?: string;
  event_timestamp?: string;
  contact?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ParsedRdConversion = {
  eventIdentifier: string;
  eventTimestamp?: string;
  rdContactUuid?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  origin?: unknown;
  customFields: Record<string, unknown>;
  rawKeys: string[];
};

const standardContactKeys = new Set([
  "uuid", "email", "name", "job_title", "bio", "website", "personal_phone",
  "mobile_phone", "city", "state", "facebook", "linkedin", "twitter", "tags",
  "company", "company_name", "empresa", "lifecycle_stage", "opportunity", "contact_owner_email", "interest",
  "fit", "origin", "legal_bases",
  "id", "created_at", "user", "first_conversion", "last_conversion",
  "number_conversions", "custom_fields",
]);

export function parseRdWebhook(body: unknown): ParsedRdConversion {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Payload do RD deve ser um objeto JSON.");
  }

  const payload = body as RdWebhook;
  const contact = payload.contact;
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
    throw new Error("Payload do RD sem o objeto contact.");
  }

  const eventIdentifier = String(payload.event_identifier ?? "").trim();
  if (!eventIdentifier) throw new Error("Payload do RD sem event_identifier.");

  const customFields = Object.fromEntries(
    Object.entries(contact).filter(([key, value]) =>
      value !== null && value !== "" && (key.startsWith("cf_") || !standardContactKeys.has(key)),
    ),
  );

  return {
    eventIdentifier,
    eventTimestamp: String(payload.event_timestamp ?? payload.timestamp ?? "") || undefined,
    rdContactUuid: String(contact.uuid ?? "") || undefined,
    name: String(contact.name ?? contact.nome ?? "Contato RD").trim() || "Contato RD",
    email: normalizeEmail(contact.email),
    phone: normalizeBrazilPhone(contact.mobile_phone ?? contact.personal_phone ?? contact.phone ?? contact.telefone ?? contact.celular),
    company: companyName(contact.company ?? contact.company_name ?? contact.empresa ?? contact.Empresa),
    origin: contact.origin ?? legacyOrigin(contact),
    customFields,
    rawKeys: Object.keys(contact).sort(),
  };
}

export function unwrapRdAutomationPayload(body: Record<string, unknown>): Record<string, unknown> {
  const leads = body.leads;
  if (!Array.isArray(leads) || !leads[0] || typeof leads[0] !== "object" || Array.isArray(leads[0])) {
    return body;
  }

  const lead = leads[0] as Record<string, unknown>;
  const nestedCustomFields = lead.custom_fields;
  const customFields = nestedCustomFields && typeof nestedCustomFields === "object" && !Array.isArray(nestedCustomFields)
    ? nestedCustomFields as Record<string, unknown>
    : {};

  const flattened = { ...lead, ...customFields };
  delete flattened.custom_fields;
  return flattened;
}

export function sanitizedReceipt(conversion: ParsedRdConversion) {
  return {
    eventIdentifier: conversion.eventIdentifier,
    hasName: Boolean(conversion.name),
    hasEmail: Boolean(conversion.email),
    hasPhone: Boolean(conversion.phone),
    contactKeys: conversion.rawKeys,
    customFieldKeys: Object.keys(conversion.customFields).sort(),
  };
}

function companyName(company: unknown): string | undefined {
  if (typeof company === "string") return company.trim() || undefined;
  if (company && typeof company === "object" && !Array.isArray(company)) {
    const name = String((company as Record<string, unknown>).name ?? "").trim();
    return name || undefined;
  }
  return undefined;
}

function legacyOrigin(contact: Record<string, unknown>): unknown {
  const conversion = contact.last_conversion;
  if (!conversion || typeof conversion !== "object" || Array.isArray(conversion)) return undefined;
  const data = conversion as Record<string, unknown>;
  return data.conversion_origin ?? data.source;
}
