from __future__ import annotations
import argparse, json, sys
from pathlib import Path
import yaml, numpy as np, torch
from torch import nn

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from eva_motion.envs.mock_humanoid import MockHumanoidEnv
from eva_motion.logging.run_logger import RunLogger
from eva_motion.export.policy_bundle import export_policy
from eva_motion.agents.coach import ask_coach

class Policy(nn.Module):
    def __init__(self, obs_dim, action_dim, hidden=(128,128)):
        super().__init__(); layers=[]; d=obs_dim
        for h in hidden: layers += [nn.Linear(d,h), nn.Tanh()]; d=h
        layers += [nn.Linear(d,action_dim), nn.Tanh()]; self.net=nn.Sequential(*layers)
    def forward(self,x): return self.net(x)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--config", default=str(ROOT/"configs/mock_walk.yaml")); args=ap.parse_args()
    cfg=yaml.safe_load(Path(args.config).read_text())
    np.random.seed(cfg["run"]["seed"]); torch.manual_seed(cfg["run"]["seed"])
    env=MockHumanoidEnv(dt=cfg["env"]["dt"], action_scale=cfg["env"]["action_scale"], seed=cfg["run"]["seed"], domain_randomization=cfg["env"].get("domain_randomization"))
    policy=Policy(env.obs_dim, env.action_dim, tuple(cfg["policy"]["hidden"])); opt=torch.optim.Adam(policy.parameters(), lr=cfg["policy"]["lr"])
    logger=RunLogger(ROOT/"runs", cfg["run"]["name"], cfg); recent=[]; best=-1e9

    for ep in range(1, cfg["run"]["episodes"]+1):
        obs=env.reset(); ep_reward=0.0
        # Simple policy-gradient-like exploratory objective for MVP plumbing.
        for step in range(1, cfg["run"]["max_steps"]+1):
            x=torch.tensor(obs,dtype=torch.float32)
            mean=policy(x); noise=torch.randn_like(mean)*0.22; action=torch.clamp(mean+noise,-1,1)
            next_obs,reward,done,info=env.step(action.detach().numpy())
            # Differentiable surrogate favors alternating gait and lower magnitude.
            target=torch.tensor([np.sin(env.t*4.2), .5, -.25, -np.sin(env.t*4.2), .5, -.25], dtype=torch.float32)*0.55
            loss=((mean-target)**2).mean() + 0.02*(mean**2).mean()
            opt.zero_grad(); loss.backward(); opt.step()
            ep_reward += reward; obs=next_obs
            row={"episode":ep,"step":step,"reward":reward,"episode_reward":ep_reward,**info,"joint_pos":env.joints.tolist(),"action":action.detach().tolist()}
            recent.append(row); recent=recent[-120:]; logger.event(row)
            if done: break
        best=max(best,ep_reward)
        print(f"episode={ep:03d} reward={ep_reward:8.2f} distance={info['distance_m']:.2f}m balance={info['balance']:.2f} fallen={info['fallen']}")
        if ep % cfg["run"]["checkpoint_every"] == 0:
            ck=logger.dir/f"checkpoint_ep{ep:03d}.pt"; torch.save(policy.state_dict(), ck)
        c=cfg.get("coach",{})
        if c.get("enabled") and ep % int(c.get("every_episodes",4))==0:
            note=ask_coach(c.get("provider","openrouter"),cfg["task"]["goal"],recent,c.get("model",""),c.get("base_url","")); logger.coach_note({"episode":ep,**note}); print("coach:",note.get("analysis",""))

    bundle=logger.dir/"policy_bundle"
    manifest=export_policy(policy,bundle,env.joint_names,env.obs_dim,cfg["env"]["action_scale"],"MVP mock environment; retrain in Isaac Lab before hardware use.")
    logger.summary({"episodes":cfg["run"]["episodes"],"best_episode_reward":best,"policy_bundle":str(bundle),"manifest":manifest})
    print("\nRun saved to:",logger.dir)

if __name__ == "__main__": main()
