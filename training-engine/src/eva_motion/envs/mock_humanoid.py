from __future__ import annotations
import math
import numpy as np

class MockHumanoidEnv:
    """A lightweight deterministic-ish 2D locomotion sandbox.

    This is intentionally NOT a replacement for Isaac Lab. It lets the full logging,
    checkpoint, coaching, and export pipeline run on a laptop before GPU simulation
    is connected.
    """
    joint_names = ["left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle"]

    def __init__(self, dt=0.02, action_scale=0.24, seed=42, domain_randomization=None):
        self.dt = dt
        self.action_scale = action_scale
        self.rng = np.random.default_rng(seed)
        self.dr = domain_randomization or {}
        self.obs_dim = 14
        self.action_dim = 6
        self.reset()

    def reset(self):
        self.t = 0.0
        self.step_count = 0
        self.x = 0.0
        self.vx = 0.0
        self.pitch = float(self.rng.normal(0, 0.025))
        self.pitch_rate = 0.0
        self.joints = np.zeros(6, dtype=np.float32)
        self.joint_vel = np.zeros(6, dtype=np.float32)
        self.mass_scale = float(self.rng.uniform(0.92, 1.08)) if self.dr.get("enabled") else 1.0
        self.friction = float(self.rng.uniform(0.7, 1.2)) if self.dr.get("enabled") else 1.0
        return self._obs()

    def _obs(self):
        phase = self.t * 4.2
        return np.concatenate([
            np.array([self.pitch, self.pitch_rate, self.vx, math.sin(phase), math.cos(phase)], dtype=np.float32),
            self.joints.astype(np.float32),
            self.joint_vel[:3].astype(np.float32),
        ])

    def step(self, action):
        action = np.clip(np.asarray(action, dtype=np.float32), -1, 1)
        desired = action * self.action_scale
        accel = (desired - self.joints) * 18.0 - self.joint_vel * 2.4
        self.joint_vel += accel * self.dt
        self.joints += self.joint_vel * self.dt

        left_drive = float(self.joints[0] - 0.45 * self.joints[1] + 0.18 * self.joints[2])
        right_drive = float(self.joints[3] - 0.45 * self.joints[4] + 0.18 * self.joints[5])
        cadence = math.sin(self.t * 4.2)
        propulsion = (left_drive * cadence - right_drive * cadence) * 0.75 * self.friction
        symmetry = abs(left_drive + right_drive)
        pitch_acc = -5.5 * self.pitch - 0.8 * self.pitch_rate + symmetry * 1.9 + float(self.rng.normal(0, 0.06))
        self.pitch_rate += pitch_acc * self.dt / self.mass_scale
        self.pitch += self.pitch_rate * self.dt
        self.vx += (propulsion - 0.6 * self.vx) * self.dt
        self.x += max(self.vx, -0.05) * self.dt
        self.t += self.dt
        self.step_count += 1

        energy = float(np.mean(np.square(action)))
        balance = max(0.0, 1.0 - abs(self.pitch) / 0.65)
        forward = np.clip(self.vx, 0, 1.2)
        reward = 1.25 * balance + 0.9 * forward - 0.18 * energy - 0.08 * symmetry
        fallen = abs(self.pitch) > 0.72
        terminated = bool(fallen)
        info = {
            "distance_m": float(self.x),
            "balance": float(balance),
            "energy": energy,
            "fall_risk": float(min(1.0, abs(self.pitch) / 0.72)),
            "pitch": float(self.pitch),
            "vx": float(self.vx),
            "fallen": fallen,
        }
        return self._obs(), float(reward), terminated, info
