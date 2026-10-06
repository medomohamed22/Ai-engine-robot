import type { ProviderConfig } from "./types";

type CoachInput = {
  provider: ProviderConfig;
  goal: string;
  telemetry: unknown;
};

const system = `You are EVA Motion Coach, a robotics training supervisor. Analyze humanoid training telemetry. Be concise, technical, and safe. Never directly command unsafe real-hardware motion. Return strict JSON with keys: analysis and nextExperiment. The nextExperiment should change only one or two training variables and should be suitable for simulation first.`;

export async function askCoach(input: CoachInput) {
  const { provider } = input;
  if (!provider.apiKey) throw new Error("API key is required for the selected provider.");
  if (!provider.selectedModel) throw new Error("Select a model first.");

  const prompt = `Training goal: ${input.goal}\nTelemetry:\n${JSON.stringify(input.telemetry, null, 2)}`;

  if (provider.kind === "gemini") {
    const base = (provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const url = `${base}/models/${encodeURIComponent(provider.selectedModel)}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": provider.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      })
    });
    if (!res.ok) throw new Error(`Gemini request failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text || "").join("") || "{}";
    return { payload: safeJson(text), model: provider.selectedModel };
  }

  const base = provider.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`,
      ...(provider.kind === "openrouter" ? { "HTTP-Referer": "https://eva-motion-lab.vercel.app", "X-Title": "EVA Motion Lab" } : {})
    },
    body: JSON.stringify({
      model: provider.selectedModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { payload: safeJson(data?.choices?.[0]?.message?.content || "{}"), model: provider.selectedModel };
}

function safeJson(text: string) {
  try {
    const clean = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean);
    return {
      analysis: String(parsed.analysis || "No analysis returned."),
      nextExperiment: String(parsed.nextExperiment || "Continue simulation and collect more telemetry.")
    };
  } catch {
    return { analysis: text.slice(0, 2000), nextExperiment: "Continue simulation and collect more telemetry." };
  }
}
