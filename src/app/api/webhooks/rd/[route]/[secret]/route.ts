import { NextRequest } from "next/server";
import { handleRdWebhook } from "../../route";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string; secret: string }> },
) {
  const { route, secret } = await context.params;
  return handleRdWebhook(request, { route, secret });
}
