# EVA Motion Lab v0.2

A prototype control center for an embodied humanoid motion-learning system. The web application runs on Next.js/Vercel, while the included Python training engine demonstrates file-based training logs, checkpoints, and policy export.

## What changed in v0.2

- No `.env` file is required for prototype AI testing.
- Add multiple AI providers directly from the web UI.
- Built-in presets for OpenRouter and Google Gemini.
- Add any OpenAI-compatible provider with a custom base URL.
- Fetch the provider's available model catalog.
- Search/filter large model lists and select the active model.
- Switch between saved providers/models instantly.
- Provider settings are stored in browser `localStorage` for prototype convenience.

> Security: browser-stored API keys are convenient for a private prototype, but they are not appropriate for a public production application. Move secrets to server-side or encrypted per-user storage before production use.

## Run the web app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, enter a provider URL/API key in **AI Provider Hub**, click **Fetch models**, search for a model, and select it.

## Deploy to Vercel

Push the repository to GitHub and import it into Vercel. No environment variables are required for this prototype version.

## Provider defaults

- OpenRouter base URL: `https://openrouter.ai/api/v1`
- Gemini base URL: `https://generativelanguage.googleapis.com/v1beta`
- OpenAI-compatible providers should expose `/models` and `/chat/completions` below the supplied base URL.

## Training engine

The browser simulation is a visualization/prototype. The Python engine under `training-engine/` demonstrates a clean path for training telemetry and policy artifacts:

```bash
cd training-engine
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .
python scripts/train_mock.py
```

Each run writes its own files under `runs/`, including JSON/JSONL telemetry, checkpoints, a summary, and an exported policy bundle.

## Sim-to-real note

A learned policy cannot be assumed to work perfectly on a physical humanoid simply because it performs well in simulation. Target hardware requires joint mapping, calibration, actuator and torque limits, control-frequency matching, latency handling, domain randomization, safety interlocks, and staged physical validation.
