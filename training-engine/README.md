# EVA Motion Engine

This folder is the simulation/training side of EVA. It is intentionally separate from the Vercel UI.

## What v0.1 does

- Runs a lightweight mock humanoid environment on CPU so the full pipeline works anywhere.
- Trains a small PyTorch motion policy.
- Writes immutable JSONL telemetry per run.
- Saves checkpoints and a final TorchScript policy bundle.
- Produces a deployment manifest containing joint order, action scale, hash, and real-hardware validation requirements.
- Can ask OpenRouter, Gemini, or a custom OpenAI-compatible endpoint to analyze telemetry.

## Run it

```bash
cd training-engine
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .
python scripts/train_mock.py
```

Every run is stored under `runs/<timestamp>_<name>/` with:

- `config.json`
- `events.jsonl`
- `coach_notes.jsonl` (when enabled)
- `checkpoint_epXXX.pt`
- `summary.json`
- `policy_bundle/policy.pt`
- `policy_bundle/manifest.json`

## Enable the AI coach

Edit `configs/mock_walk.yaml` and set `coach.enabled: true`, then export the provider key, for example:

```bash
export OPENROUTER_API_KEY=...
# or
export GEMINI_API_KEY=...
```

## Isaac Lab integration path

Replace `MockHumanoidEnv` with an Isaac Lab task that preserves the same contract:

```python
obs = env.reset()
next_obs, reward, done, info = env.step(action)
```

Keep the joint order explicit and reuse `RunLogger` and `export_policy`. The current mock environment is for pipeline development only; it is not a physically faithful humanoid simulator.

## Sim-to-real note

A policy learned in simulation cannot be assumed error-free on a real robot. Real hardware requires joint mapping, calibration, actuator limits, latency handling, system identification/domain randomization, staged support-rig testing, fall protection, and emergency stop logic.
