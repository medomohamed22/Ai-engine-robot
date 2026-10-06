import { NextResponse } from "next/server";
import { askCoach } from "@/lib/coach";
import type { ProviderConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = body.provider as ProviderConfig | undefined;
    if (!provider || !["openrouter", "gemini", "openai-compatible"].includes(provider.kind)) {
      return NextResponse.json({ error: "Invalid provider configuration." }, { status: 400 });
    }
    const { payload, model } = await askCoach({
      provider,
      goal: String(body.goal || "Stand and walk stably"),
      telemetry: body.telemetry || {}
    });
    return NextResponse.json({ ...payload, provider: provider.name, model });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
