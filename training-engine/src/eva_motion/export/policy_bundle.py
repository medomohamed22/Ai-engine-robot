from __future__ import annotations
import json, hashlib
from pathlib import Path
from datetime import datetime, timezone
import torch

def export_policy(policy: torch.nn.Module, out_dir: str | Path, joint_names: list[str], obs_dim: int, action_scale: float, notes: str = ""):
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    policy.eval()
    scripted = torch.jit.script(policy.cpu())
    policy_path = out / "policy.pt"
    scripted.save(str(policy_path))
    sha = hashlib.sha256(policy_path.read_bytes()).hexdigest()
    manifest = {
        "schema":"eva.motion.policy.v1",
        "created_at":datetime.now(timezone.utc).isoformat(),
        "format":"torchscript",
        "policy_file":"policy.pt",
        "sha256":sha,
        "observation_dim":obs_dim,
        "action_dim":len(joint_names),
        "joint_order":joint_names,
        "action_scale":action_scale,
        "deployment_status":"SIMULATION_ONLY_UNTIL_VALIDATED",
        "required_real_robot_steps":[
            "verify joint order and sign conventions",
            "calibrate zero positions and action scaling",
            "enforce torque/position/velocity limits",
            "add emergency stop and fall detection",
            "test on support rig at low speed",
            "perform system identification / domain randomization validation"
        ],
        "notes":notes
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
