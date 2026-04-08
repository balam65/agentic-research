import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldCheck, Database, GitBranch, Terminal, Globe, Plus, Cpu, Layers, Beaker, FileCode, ServerCrash, Send } from 'lucide-react';

// Simulated State Flags that drive the entire operation
type StateFlags = string[];

export default function App() {
  const [events, setEvents] = useState<{id: number, name: string, capability: string, time: string, logic: string}[]>([]);
  const [activeFlags, setActiveFlags] = useState<StateFlags>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [orchestratorStatus, setOrchestratorStatus] = useState<string>('Standby');
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const eventEndRef = useRef<HTMLDivElement>(null);

  // The Capabilities map purely to generic skills, NOT the workflow
  const capabilities = [
    { name: 'Assessment', icon: <Cpu className="w-4 h-4 text-blue-400" />, status: activeFlags.includes('raw_input') ? 'Ready' : 'Standby' },
    { name: 'ScheduleManager', icon: <Layers className="w-4 h-4 text-purple-400" />, status: activeFlags.includes('has_target') ? 'Ready' : 'Standby' },
    { name: 'ScriptSelector', icon: <FileCode className="w-4 h-4 text-emerald-400" />, status: activeFlags.includes('target_queued') ? 'Ready' : 'Standby' },
    { name: 'UrlDiscovery', icon: <Globe className="w-4 h-4 text-amber-400" />, status: activeFlags.includes('script_missing') ? 'Ready' : 'Standby' },
    { name: 'Scripting', icon: <Terminal className="w-4 h-4 text-orange-400" />, status: activeFlags.includes('urls_discovered') ? 'Ready' : 'Standby' },
    { name: 'ProductionScale', icon: <ServerCrash className="w-4 h-4 text-indigo-400" />, status: activeFlags.includes('script_available') ? 'Ready' : 'Standby' },
    { name: 'DataExtractor', icon: <Database className="w-4 h-4 text-cyan-400" />, status: activeFlags.includes('proxy_acquired') ? 'Ready' : 'Standby' },
    { name: 'QAValidation', icon: <ShieldCheck className="w-4 h-4 text-rose-400" />, status: activeFlags.includes('raw_payload') ? 'Ready' : 'Standby' },
    { name: 'Delivery', icon: <Send className="w-4 h-4 text-brand-400" />, status: activeFlags.includes('qa_validated') ? 'Ready' : 'Standby' }
  ];

  // Simulated AI Logic Engine (The Engine figures out the sequence via State mapping)
  const executionPath = [
    { cap: 'Assessment',  addsState: 'has_target', logic: 'Operating Frame: Input detected. No target mapped. Routing to Assessment -> Intent.' },
    { cap: 'ScheduleManager', addsState: 'target_queued', logic: 'Operating Frame: Target exists, but not queued. Enforcing SLA rules.' },
    { cap: 'ScriptSelector', addsState: 'script_missing', logic: 'Operating Frame: Checking Knowledge DB for target script...' },
    // Notice the dynamic choice here based on 'script_missing'
    { cap: 'UrlDiscovery', addsState: 'urls_discovered', logic: 'Operating Frame: Constraint Triggered! Extractor requires script. State is script_missing. Routing to Discovery.' },
    { cap: 'Scripting', addsState: 'script_available', logic: 'Operating Frame: URLs found. DOM needs mapping. Calling GenAI Scripting Agent.' },
    { cap: 'ProductionScale', addsState: 'proxy_acquired', logic: 'Operating Frame: Script available. Extractor needs Proxy pool. Allocating AWS IPs.' },
    { cap: 'DataExtractor', addsState: 'raw_payload', logic: 'Operating Frame: All constraints met (Script + Proxy). Commencing headless browser run.' },
    { cap: 'QAValidation', addsState: 'qa_validated', logic: 'Operating Frame: Extraction complete. Must pass 0.8 Confidence threshold before delivery.' },
    { cap: 'Delivery', addsState: 'delivered_to_client', logic: 'Operating Frame: QA passed. Initiating SFTP shipment.' }
  ];

  // Auto-scroll to bottom of events
  useEffect(() => {
    eventEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Master Agent Simulation Runner
  useEffect(() => {
    if (currentStepIndex >= 0 && currentStepIndex < executionPath.length) {
      setOrchestratorStatus('Cognitive Routing...');
      
      const step = executionPath[currentStepIndex];
      
      const timer = setTimeout(() => {
        const newEvent = {
          id: Date.now(),
          name: `State Emitted: [${step.addsState}]`,
          capability: step.cap,
          time: new Date().toLocaleTimeString(),
          logic: step.logic
        };
        
        setEvents(prev => [...prev, newEvent]);
        setActiveFlags(prev => [...prev, step.addsState]);
        
        if (currentStepIndex < executionPath.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setOrchestratorStatus('Pipeline Complete');
          setIsDeploying(false);
        }
      }, 2500); // 2.5s delay to represent agentic thought process per step
      
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex]);

  const handleDeployTarget = () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setEvents([]);
    setActiveFlags(['raw_input']);
    setOrchestratorStatus('Assessing Event Context');
    
    // Drop the initial intent trigger
    setTimeout(() => {
      setEvents([{
        id: Date.now(),
        name: 'Event: raw_input_received',
        capability: 'API Gateway',
        time: new Date().toLocaleTimeString(),
        logic: 'Target: https://airlines-source.com/pricing'
      }]);
      // Trigger the engine
      setCurrentStepIndex(0);
    }, 1000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 text-sm">
      
      {/* Header */}
      <header className="flex items-center justify-between glass-panel p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-500/20 rounded-lg border border-brand-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Activity className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Agentic Web Scraper Factory</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Autonomous State-Driven Orchestration Console</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={handleDeployTarget}
            disabled={isDeploying}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors border border-emerald-500/50 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
             {isDeploying ? <ServerCrash className="w-4 h-4 animate-spin" /> : <Beaker className="w-4 h-4" />}
             {isDeploying ? 'Agents Active...' : 'Deploy Demo Extractor'}
          </button>
          <div className="h-8 w-px bg-dark-700"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Master Agent</span>
            <div className="flex items-center gap-2">
              <span className={`flex h-2 w-2 relative ${isDeploying ? '' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              <span className={`font-mono font-semibold ${isDeploying ? 'text-brand-400' : 'text-slate-500'}`}>
                {orchestratorStatus}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-[70vh]">
        
        {/* Left Column - Capability Registry */}
        <div className="lg:col-span-3 glass-panel p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 border-b border-dark-700 pb-3">
            <h2 className="font-semibold flex items-center gap-2 text-slate-200">
              <GitBranch className="w-4 h-4 text-slate-400" />
              Generic Capabilities
            </h2>
          </div>
          
          <div className="flex flex-col gap-2">
            {capabilities.map((cap) => {
              const isActiveObj = currentStepIndex >= 0 && executionPath[currentStepIndex]?.cap === cap.name;
              return (
                <div key={cap.name} className={`flex flex-col p-2.5 rounded border transition-all duration-300 ${
                  isActiveObj ? 'bg-brand-500/10 border-brand-500/50 scale-105 shadow-[0_0_10px_rgba(59,130,246,0.15)]' : 
                  'bg-dark-800/50 border-dark-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {cap.icon}
                      <span className={`font-mono text-xs ${isActiveObj ? 'text-brand-300 font-bold' : 'text-slate-300'}`}>{cap.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Active World State View */}
          <div className="mt-auto border-t border-dark-700 pt-4">
             <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Active State Flags</h3>
             <div className="flex flex-wrap gap-1.5">
               {activeFlags.length === 0 && <span className="text-slate-600 text-xs italic">No active state context</span>}
               {activeFlags.map(flag => (
                 <span key={flag} className="px-2 py-0.5 bg-dark-700 text-slate-300 border border-dark-600 rounded text-[10px] font-mono whitespace-nowrap">
                   {flag}
                 </span>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column - Event Feed (World Model) */}
        <div className="lg:col-span-9 glass-panel p-6 flex flex-col relative overflow-hidden">
           {/* Grid Pattern Background */}
           <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CgkJPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJub25lIj48L3JlY3Q+CgkJPGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNSkiPjwvY2lyY2xlPgoJPC9zdmc+')] opacity-50 z-0 pointer-events-none"></div>

           <div className="flex items-center justify-between mb-4 border-b border-dark-700 pb-4 relative z-10">
            <div>
              <h2 className="font-semibold flex items-center gap-2 text-slate-200">
                <Terminal className="w-4 h-4 text-slate-400" />
                World Model: Agentic Cognitive Trace
              </h2>
            </div>
            <div className="px-3 py-1.5 bg-dark-900 rounded border border-dark-700 font-mono text-[10px] text-brand-400">
               Operating Frame Constraint Enforcement: STRICT
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative z-10 pb-10">
            {events.length === 0 && !isDeploying && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                 <ServerCrash className="w-12 h-12 mb-3" />
                 <p>System idle. Awaiting generic inputs to infer orchestration path.</p>
              </div>
            )}
            
            {events.map((event, index) => (
              <div key={event.id} className="relative pl-7 group animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Timeline Line */}
                {index !== events.length - 1 && (
                  <div className="absolute left-[13px] top-6 bottom-[-24px] w-[1px] bg-dark-600"></div>
                )}
                
                {/* Timeline Node */}
                <div className="absolute left-[8px] top-1.5 w-[11px] h-[11px] rounded-full bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] z-10"></div>
                
                {/* Action Card */}
                <div className="bg-dark-800/80 border-l-2 border-brand-500 rounded-r-lg p-3.5 mb-1 ml-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-mono text-[10px] border border-brand-500/20">
                        Capability: {event.capability}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{event.time}</span>
                  </div>
                  
                  {/* Master Agent Thought Process */}
                  <div className="mt-2 p-2 bg-dark-900 border border-dark-700/50 rounded flex gap-2">
                    <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                      <span className="text-slate-500 mr-1">$</span>
                      {event.logic}
                    </p>
                  </div>
                  
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <strong>Outcome:</strong> {event.name}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Thinking / Routing Placeholder */}
            {isDeploying && orchestratorStatus === 'Cognitive Routing...' && (
               <div className="relative pl-7 animate-in fade-in duration-300">
                  <div className="absolute left-[8px] top-1.5 w-[11px] h-[11px] rounded-full bg-transparent border border-brand-400 border-dashed animate-spin z-10"></div>
                  <div className="ml-2 flex items-center gap-3 py-1">
                    <span className="text-[11px] font-mono text-brand-400/80 animate-pulse">Master Agent matching current state against constraints...</span>
                  </div>
               </div>
            )}
            
            <div ref={eventEndRef} />
          </div>
        </div>
        
      </div>
    </div>
  );
}
