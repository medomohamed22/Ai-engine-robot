import { NextResponse } from "next/server";
import type { ModelOption, ProviderConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const provider = (await req.json()) as ProviderConfig;
    if (!provider?.apiKey) return NextResponse.json({ error: "API key is required." }, { status: 400 });

    if (provider.kind === "gemini") {
      const base = (provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
      const res = await fetch(`${base}/models?pageSize=1000`, {
        headers: { "x-goog-api-key": provider.apiKey }, cache: "no-store"
      });
      if (!res.ok) throw new Error(`Gemini models request failed (${res.status}): ${await res.text()}`);
      const data = await res.json();
      const models: ModelOption[] = (data.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => ({
          id: String(m.name || "").replace(/^models\//, ""),
          name: m.displayName || String(m.name || "").replace(/^models\//, ""),
          description: m.description || "",
          contextLength: m.inputTokenLimit
        }));
      return NextResponse.json({ models });
    }

    const base = provider.baseUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/models`, {
      headers: {
        "Authorization": `Bearer ${provider.apiKey}`,
        ...(provider.kind === "openrouter" ? { "HTTP-Referer": "https://eva-motion-lab.vercel.app", "X-Title": "EVA Motion Lab" } : {})
      },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Models request failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data.data || data.models || []);
    const models: ModelOption[] = raw.map((m: any) => ({
      id: String(m.id || m.name || ""),
      name: String(m.name || m.id || ""),
      description: m.description || "",
      contextLength: m.context_length || m.contextLength,
      provider: m.owned_by || undefined
    })).filter((m: ModelOption) => m.id);
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not fetch models." }, { status: 500 });
  }
}
