import { NextRequest, NextResponse } from "next/server";
import { agendaIdentifierFromContact, conversionIdentifierFromContact, parseRdWebhook, sanitizedReceipt, unwrapRdAutomationPayload } from "@/lib/rd";
import { syncConversion } from "@/lib/sync";
import { KommoError, safeKommoErrorDetail } from "@/lib/kommo";
import { isAgendaEvent, isCourseLandingPageEvent, isEquilibraEvent } from "@/config/products";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleRdWebhook(request);
}

export async function handleRdWebhook(
  request: NextRequest,
  pathCredentials?: { route: string; secret: string },
) {
  const configuredSecret = process.env.RD_WEBHOOK_SECRET;
  const suppliedSecret = pathCredentials?.secret || request.nextUrl.searchParams.get("secret") || request.headers.get("x-webhook-secret");
  if (!configuredSecret) {
    return NextResponse.json({ ok: false, error: "RD_WEBHOOK_SECRET não configurado." }, { status: 503 });
  }
  if (suppliedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Webhook não autorizado." }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return NextResponse.json({ ok: true, mode: "validation" });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: true, mode: "validation" });
    }

    const record = body as Record<string, unknown>;
    const automationRoute = pathCredentials?.route || request.nextUrl.searchParams.get("route")?.trim();
    const isStandardWebhook = "event_identifier" in record && "contact" in record;

    if (isStandardWebhook && automationRoute === "agendas") {
      const eventIdentifier = String(record.event_identifier ?? "");
      if (!isAgendaEvent(eventIdentifier)) {
        return NextResponse.json({ ok: true, status: "ignored", reason: "Conversão não pertence às agendas" });
      }
    }
    if (isStandardWebhook && automationRoute === "equilibra") {
      const eventIdentifier = String(record.event_identifier ?? "");
      if (!isEquilibraEvent(eventIdentifier)) {
        return NextResponse.json({ ok: true, status: "ignored", reason: "Conversão não pertence à Equilibra" });
      }
    }
    if (isStandardWebhook && automationRoute === "cursos") {
      const eventIdentifier = String(record.event_identifier ?? "");
      if (!isCourseLandingPageEvent(eventIdentifier)) {
        return NextResponse.json({ ok: true, status: "ignored", reason: "Conversão não pertence às LPs de cursos" });
      }
    }

    if (!isStandardWebhook && automationRoute) {
      const contact = unwrapRdAutomationPayload(record);
      const detectedIdentifier = automationRoute === "agendas"
        ? agendaIdentifierFromContact(contact) || conversionIdentifierFromContact(contact)
        : automationRoute === "equilibra"
          ? conversionIdentifierFromContact(contact)
          : automationRoute === "cursos"
            ? conversionIdentifierFromContact(contact)
          : undefined;
      if (automationRoute === "equilibra" && (!detectedIdentifier || !isEquilibraEvent(detectedIdentifier))) {
        return NextResponse.json({ ok: true, status: "ignored", reason: "Conversão não pertence à Equilibra" });
      }
      if (automationRoute === "cursos" && (!detectedIdentifier || !isCourseLandingPageEvent(detectedIdentifier))) {
        return NextResponse.json({ ok: true, status: "ignored", reason: "Conversão não pertence às LPs de cursos" });
      }
      body = {
        event_type: "RD_AUTOMATION",
        entity_type: "CONTACT",
        event_identifier: detectedIdentifier && (
          isAgendaEvent(detectedIdentifier)
          || isEquilibraEvent(detectedIdentifier)
          || isCourseLandingPageEvent(detectedIdentifier)
        ) ? detectedIdentifier : automationRoute,
        event_timestamp: new Date().toISOString(),
        contact,
      };
    } else if (!isStandardWebhook) {
      return NextResponse.json({ ok: true, mode: "validation" });
    }

    const conversion = parseRdWebhook(body);
    const receipt = sanitizedReceipt(conversion);

    if (process.env.KOMMO_SYNC_ENABLED !== "true") {
      console.info("RD webhook capturado (modo seguro)", receipt);
      return NextResponse.json({ ok: true, mode: "capture", receipt });
    }

    const result = await syncConversion(conversion);
    console.info("RD webhook processado", JSON.stringify({ eventIdentifier: conversion.eventIdentifier, ...result }));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const kommo = error instanceof KommoError
      ? {
          status: error.status,
          operation: error.operation,
          detail: safeKommoErrorDetail(error.detail),
          context: error.context,
        }
      : undefined;
    console.error("Falha ao processar webhook RD", JSON.stringify({ message, kommo }));
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
