from __future__ import annotations
import json, os, requests

SYSTEM = """You are EVA Motion Coach. Analyze simulation telemetry for humanoid locomotion.
Return strict JSON with keys analysis and nextExperiment. Change at most two variables.
Never claim a simulation policy is safe for real hardware; recommend simulation-first validation."""

def ask_coach(provider: str, goal: str, telemetry: list[dict], model: str = "", base_url: str = "") -> dict:
    prompt = f"Goal: {goal}\nRecent telemetry:\n{json.dumps(telemetry[-80:], indent=2)}"
    if provider == "gemini":
        key = os.environ.get("GEMINI_API_KEY")
        if not key: raise RuntimeError("GEMINI_API_KEY is not set")
        model = model or os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        r = requests.post(url, headers={"x-goog-api-key": key, "Content-Type":"application/json"}, json={
            "systemInstruction":{"parts":[{"text":SYSTEM}]},
            "contents":[{"role":"user","parts":[{"text":prompt}]}],
            "generationConfig":{"responseMimeType":"application/json","temperature":0.2}
        }, timeout=60)
        r.raise_for_status()
        text = "".join(p.get("text","") for p in r.json()["candidates"][0]["content"]["parts"])
    else:
        custom = provider == "custom"
        key = os.environ.get("CUSTOM_LLM_API_KEY" if custom else "OPENROUTER_API_KEY")
        if not key: raise RuntimeError("LLM API key is not set")
        base = (base_url or os.environ.get("CUSTOM_LLM_BASE_URL" if custom else "OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1").rstrip("/")
        model = model or os.environ.get("CUSTOM_LLM_MODEL" if custom else "OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
        r = requests.post(base + "/chat/completions", headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"}, json={
            "model":model,"temperature":0.2,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":SYSTEM},{"role":"user","content":prompt}]
        }, timeout=60)
        r.raise_for_status(); text = r.json()["choices"][0]["message"]["content"]
    try: return {**json.loads(text.strip().removeprefix("```json").removesuffix("```")), "model":model, "provider":provider}
    except Exception: return {"analysis":text[:2000],"nextExperiment":"Collect more simulation telemetry.","model":model,"provider":provider}
