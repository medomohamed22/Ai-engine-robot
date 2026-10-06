"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Humanoid } from "./Humanoid";
import type { ModelOption, ProviderConfig, ProviderKind, TrainingSample } from "@/lib/types";

const initialLogs = ["[boot] EVA Motion Engine ready.", "[sim] Waiting for training command."];
const STORAGE_KEY = "eva.providers.v2";

const defaults: ProviderConfig[] = [
  { id: "openrouter", name: "OpenRouter", kind: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: "", selectedModel: "" },
  { id: "gemini", name: "Google Gemini", kind: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", apiKey: "", selectedModel: "" }
];

function clamp(v:number, a=0, b=1){ return Math.max(a, Math.min(b,v)); }
function rnd(n:number){ return Math.round(n*100)/100; }
function uid(){ return `provider-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

export default function Dashboard() {
  const [running, setRunning] = useState(false);
  const [episode, setEpisode] = useState(0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState(0);
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const [goal, setGoal] = useState("Stand stably for 10 seconds, then walk 3 meters forward.");
  const [providers, setProviders] = useState<ProviderConfig[]>(defaults);
  const [activeProviderId, setActiveProviderId] = useState("openrouter");
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, ModelOption[]>>({});
  const [modelSearch, setModelSearch] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [providerMessage, setProviderMessage] = useState("Add an API key, fetch models, then choose the active model.");
  const [coach, setCoach] = useState("The AI coach is waiting for telemetry. Start the simulation, then request an analysis.");
  const [experiment, setExperiment] = useState("No experiment proposed yet.");
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {providers:ProviderConfig[];activeProviderId:string};
        if (Array.isArray(parsed.providers) && parsed.providers.length) {
          setProviders(parsed.providers);
          setActiveProviderId(parsed.activeProviderId || parsed.providers[0].id);
        }
      }
    } catch { /* ignore corrupt local data */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({providers, activeProviderId})); } catch { /* storage can be disabled */ }
  }, [providers, activeProviderId]);

  const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];
  const modelOptions = modelsByProvider[activeProvider?.id] || [];
  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return modelOptions;
    return modelOptions.filter(m => `${m.id} ${m.name} ${m.description || ""} ${m.provider || ""}`.toLowerCase().includes(q));
  }, [modelOptions, modelSearch]);

  const latest = samples.at(-1);
  const metrics = useMemo(() => latest || ({ balance:.51, distance:0, energy:100, fallRisk:.32, reward:0 } as Partial<TrainingSample>), [latest]);

  useEffect(() => {
    if (!running) { if (timer.current) clearInterval(timer.current); return; }
    timer.current = setInterval(() => {
      setPhase(p => p + .18);
      setStep(s => s + 1);
      setSamples(prev => {
        const ep = episode || 1;
        const st = step + 1;
        const learning = clamp((prev.length + 20) / 540);
        const noise = (Math.random() - .5) * .09;
        const balance = clamp(.46 + learning * .42 + noise);
        const fallRisk = clamp(.48 - learning * .37 + Math.abs(noise)*.7);
        const distance = Math.max(0, (prev.at(-1)?.distance || 0) + (.012 + learning*.026) * (balance > .46 ? 1 : .15));
        const energy = Math.max(58, 110 - learning*35 + Math.random()*5);
        const reward = balance*1.5 + Math.min(distance,3)*.22 - fallRisk*.8 - energy/900;
        const fallen = Math.random() < fallRisk * .018;
        const event: TrainingSample["event"] = fallen ? "fall" : (st % 80 === 0 ? "checkpoint" : "step");
        const sample: TrainingSample = {
          ts: new Date().toISOString(), episode: ep, step: st, reward:rnd(reward), balance:rnd(balance), distance:rnd(distance), energy:rnd(energy), fallRisk:rnd(fallRisk),
          hip:rnd(Math.sin(st/9)*12), knee:rnd(18+Math.sin(st/8)*16), ankle:rnd(Math.sin(st/7)*9), event
        };
        if (fallen) {
          setLogs(l => [...l.slice(-18), `[episode ${ep}] fall detected at ${distance.toFixed(2)}m — checkpointing telemetry.`]);
          setEpisode(e => e + 1); setStep(0);
          return [...prev, sample];
        }
        if (event === "checkpoint") setLogs(l => [...l.slice(-18), `[checkpoint] ep=${ep} reward=${sample.reward} balance=${sample.balance} distance=${sample.distance}m`]);
        return [...prev, sample].slice(-1200);
      });
    }, 180);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running, episode, step]);

  function updateProvider(patch: Partial<ProviderConfig>) {
    if (!activeProvider) return;
    setProviders(list => list.map(p => p.id === activeProvider.id ? {...p, ...patch} : p));
  }
  function addProvider(){
    const p: ProviderConfig = { id: uid(), name: "New Provider", kind: "openai-compatible", baseUrl: "https://api.example.com/v1", apiKey: "", selectedModel: "" };
    setProviders(list => [...list, p]); setActiveProviderId(p.id); setModelSearch(""); setProviderMessage("Configure the provider URL and API key, then fetch models.");
  }
  function removeProvider(){
    if (!activeProvider || providers.length <= 1) return;
    const next = providers.filter(p => p.id !== activeProvider.id);
    setProviders(next); setActiveProviderId(next[0].id); setModelSearch("");
  }
  function changeKind(kind: ProviderKind){
    const preset = kind === "openrouter" ? {name:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1"} : kind === "gemini" ? {name:"Google Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta"} : {name:activeProvider.name || "OpenAI-compatible",baseUrl:"https://api.example.com/v1"};
    updateProvider({ kind, ...preset, selectedModel:"" });
    setModelsByProvider(x => ({...x,[activeProvider.id]:[]}));
  }
  async function fetchModels(){
    if (!activeProvider) return;
    setLoadingModels(true); setProviderMessage("Fetching available models…");
    try {
      const res = await fetch("/api/models", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(activeProvider) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not fetch models");
      const models = (data.models || []) as ModelOption[];
      setModelsByProvider(x => ({...x,[activeProvider.id]:models}));
      setProviderMessage(`${models.length.toLocaleString()} models loaded. Search and select one below.`);
    } catch(e){ setProviderMessage(e instanceof Error ? e.message : "Could not fetch models."); }
    finally { setLoadingModels(false); }
  }

  function start(){ setRunning(true); if (!episode) setEpisode(1); setLogs(l => [...l, `[train] started goal: ${goal}`]); }
  function reset(){ setRunning(false); setEpisode(0); setStep(0); setSamples([]); setPhase(0); setLogs(initialLogs); setCoach("The AI coach is waiting for telemetry. Start the simulation, then request an analysis."); setExperiment("No experiment proposed yet."); }
  function exportLogs(){
    const header = { schema:"eva.motion.telemetry.v1", goal, exportedAt:new Date().toISOString(), sampleCount:samples.length };
    const body = [JSON.stringify(header), ...samples.map(s=>JSON.stringify(s))].join("\n");
    const blob = new Blob([body], {type:"application/x-ndjson"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`eva-run-${Date.now()}.jsonl`; a.click(); URL.revokeObjectURL(url);
  }
  async function askCoach(){
    if (!activeProvider?.apiKey || !activeProvider?.selectedModel) { setCoach("Configure an API key and select a model first."); return; }
    setLoadingCoach(true); setCoach("Analyzing recent telemetry…");
    try {
      const telemetry = samples.slice(-80);
      const res = await fetch("/api/coach", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({provider:activeProvider,goal,telemetry})});
      const data = await res.json(); if(!res.ok) throw new Error(data.error || "Coach request failed");
      setCoach(data.analysis); setExperiment(data.nextExperiment); setLogs(l => [...l.slice(-18), `[coach:${data.provider}/${data.model}] analysis received.`]);
    } catch(e){ setCoach(e instanceof Error ? e.message : "Unknown coach error"); }
    finally { setLoadingCoach(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="logo"><span>EV</span></div><div className="title"><h1>EVA Motion Lab</h1><p>Embodied Virtual Autonomous Learner · Motion Engine v0.2</p></div></div>
      <div className="status"><div className="badge"><span className="dot"/> Simulation {running?"running":"ready"}</div><div className="badge">Runtime AI providers · No .env</div><div className="badge">Logs · JSONL</div></div>
    </header>

    <section className="grid">
      <div className="panel">
        <div className="panelHead"><div><div className="eyebrow">Digital Twin</div><div className="panelTitle">Humanoid locomotion sandbox</div></div><div className="badge">Episode {episode || "—"}</div></div>
        <div className="simStage">
          <div className="hud">
            <div className="hudCard"><div className="hudLabel">Current goal</div><div style={{fontSize:12,lineHeight:1.5,marginTop:6}}>{goal}</div></div>
            <div className="hudCard"><div className="metricRow"><span>Balance</span><b>{Math.round((metrics.balance||0)*100)}%</b></div><div className="progress"><div style={{width:`${(metrics.balance||0)*100}%`}} /></div><div className="metricRow"><span>Fall risk</span><b>{Math.round((metrics.fallRisk||0)*100)}%</b></div><div className="metricRow"><span>Reward</span><b>{Number(metrics.reward||0).toFixed(2)}</b></div></div>
          </div>
          <div className="humanoidWrap"><Humanoid phase={phase} fallRisk={metrics.fallRisk||0}/></div>
          <div className="bottomHUD">
            <div className="kpi"><span className="hudLabel">Distance</span><strong>{Number(metrics.distance||0).toFixed(2)} m</strong></div>
            <div className="kpi"><span className="hudLabel">Energy index</span><strong>{Number(metrics.energy||0).toFixed(1)}</strong></div>
            <div className="kpi"><span className="hudLabel">Training step</span><strong>{step}</strong></div>
            <div className="kpi"><span className="hudLabel">Samples</span><strong>{samples.length}</strong></div>
          </div>
        </div>
      </div>

      <aside className="side">
        <div className="panel card"><h3>Training Control</h3><div className="formGrid"><div><label className="label">Goal</label><input className="field" value={goal} onChange={e=>setGoal(e.target.value)} /></div></div><div className="actions"><button className="btn primary" onClick={start} disabled={running}>Start training</button><button className="btn" onClick={()=>setRunning(false)} disabled={!running}>Pause</button><button className="btn danger" onClick={reset}>Reset</button><button className="btn" onClick={exportLogs} disabled={!samples.length}>Export JSONL</button></div></div>

        <div className="panel card providerCard">
          <div className="providerTitleRow"><div><h3>AI Provider Hub</h3><div className="microcopy">Keys stay in this browser&apos;s local storage for this prototype.</div></div><button className="btn compact" onClick={addProvider}>+ Add provider</button></div>
          <div className="providerTabs">{providers.map(p => <button key={p.id} onClick={()=>{setActiveProviderId(p.id);setModelSearch("");}} className={`providerTab ${p.id===activeProvider?.id?"active":""}`}><span className="providerDot"/>{p.name || "Provider"}{p.selectedModel && <small>{p.selectedModel.split("/").pop()}</small>}</button>)}</div>
          {activeProvider && <>
            <div className="formGrid twoCol">
              <div><label className="label">Provider type</label><select className="field" value={activeProvider.kind} onChange={e=>changeKind(e.target.value as ProviderKind)}><option value="openrouter">OpenRouter</option><option value="gemini">Google Gemini</option><option value="openai-compatible">OpenAI-compatible</option></select></div>
              <div><label className="label">Display name</label><input className="field" value={activeProvider.name} onChange={e=>updateProvider({name:e.target.value})}/></div>
            </div>
            <div className="formGrid">
              <div><label className="label">Base URL</label><input className="field mono" value={activeProvider.baseUrl} onChange={e=>updateProvider({baseUrl:e.target.value})}/></div>
              <div><label className="label">API key</label><div className="keyRow"><input className="field mono" type={showKey?"text":"password"} placeholder="Paste key for this session" value={activeProvider.apiKey} onChange={e=>updateProvider({apiKey:e.target.value})}/><button className="btn compact" onClick={()=>setShowKey(v=>!v)}>{showKey?"Hide":"Show"}</button></div></div>
            </div>
            <div className="actions spread"><div><button className="btn primary" onClick={fetchModels} disabled={loadingModels || !activeProvider.apiKey}>{loadingModels?"Fetching…":"Fetch models"}</button>{providers.length>1 && <button className="btn danger" onClick={removeProvider}>Remove</button>}</div><span className="modelCount">{modelOptions.length ? `${modelOptions.length.toLocaleString()} loaded` : "No models loaded"}</span></div>
            <div className="providerMessage">{providerMessage}</div>
            <div className="modelPicker">
              <div className="searchRow"><input className="field" placeholder="Search models by name, ID or description…" value={modelSearch} onChange={e=>setModelSearch(e.target.value)}/><span>{filteredModels.length.toLocaleString()}</span></div>
              <div className="modelList">{filteredModels.slice(0,120).map(m => <button key={m.id} className={`modelItem ${activeProvider.selectedModel===m.id?"selected":""}`} onClick={()=>updateProvider({selectedModel:m.id})}><div><strong>{m.name || m.id}</strong><code>{m.id}</code></div><div className="modelMeta">{m.contextLength ? `${Number(m.contextLength).toLocaleString()} ctx` : ""}</div></button>)}{!filteredModels.length && <div className="emptyModels">Fetch models or change your search.</div>}</div>
              {filteredModels.length>120 && <div className="microcopy modelHint">Showing the first 120 matches. Narrow the search to find a specific model.</div>}
            </div>
            <div className="activeModel"><span>Active model</span><strong>{activeProvider.selectedModel || "Not selected"}</strong></div>
          </>}
        </div>

        <div className="panel card"><h3>AI Motion Coach</h3><div className="microcopy">Current route: {activeProvider?.name || "—"} → {activeProvider?.selectedModel || "select a model"}</div><div className="actions"><button className="btn primary" onClick={askCoach} disabled={loadingCoach || samples.length<10 || !activeProvider?.selectedModel}>{loadingCoach?"Analyzing…":"Analyze run"}</button></div><div style={{height:10}}/><div className="label">Coach analysis</div><div className="agentText">{coach}</div><div style={{height:10}}/><div className="label">Next simulation experiment</div><div className="agentText">{experiment}</div></div>

        <div className="panel card"><h3>Telemetry stream</h3><div className="logBox">{logs.join("\n")}</div></div>
      </aside>
    </section>
    <div className="footerNote"><b>Prototype security note:</b> provider credentials are intentionally entered in the UI and persisted in localStorage so you can test without environment variables. Requests are proxied through this app&apos;s server routes but credentials are not written to the project filesystem. For a public production deployment, move secrets to server-side storage or per-user encrypted credentials. Real robot policies must still be calibrated, constrained and validated on the target hardware before deployment.</div>
  </main>
}
