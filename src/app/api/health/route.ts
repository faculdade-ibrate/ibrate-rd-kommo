import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "ibrate-rd-kommo",
    kommoConfigured: Boolean(process.env.KOMMO_SUBDOMAIN && process.env.KOMMO_LONG_LIVED_TOKEN),
    rdWebhookConfigured: Boolean(process.env.RD_WEBHOOK_SECRET),
    syncEnabled: process.env.KOMMO_SYNC_ENABLED === "true",
  });
}
