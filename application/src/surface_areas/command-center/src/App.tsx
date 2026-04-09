import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, ShieldCheck, Database, Terminal, Globe, Cpu, Layers,
  ServerCrash, Bot, Zap, Play, Square, RefreshCcw, AlertTriangle, Power,
  Settings2, Binary, Table, Users, Truck, BarChart3, CheckCircle2, XCircle,
  Clock, Package, Wifi, FileCode
} from 'lucide-react';
import { supabase } from './lib/supabase';

const statusColors: Record<string, string> = {
  pending:    'text-amber-400 bg-amber-400/10 border-amber-400/30',
  running:    'text-sky-400 bg-sky-400/10 border-sky-400/30',
  hitl_alert: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  failed:     'text-rose-400 bg-rose-400/10 border-rose-400/30',
  completed:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  success:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  error:      'text-rose-400 bg-rose-400/10 border-rose-400/30',
};

type RightTab = 'results' | 'fleet' | 'clients' | 'delivery';

export default function App() {
  const [jobs, setJobs]                     = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId]   = useState<string | null>(null);
  const [events, setEvents]                 = useState<any[]>([]);
  const [globalEvents, setGlobalEvents]     = useState<any[]>([]);
  const [eventsError, setEventsError]       = useState<string | null>(null);
  const [capabilities, setCapabilities]     = useState<any[]>([]);
  const [extractedData, setExtractedData]   = useState<any | null>(null);
  // Cache results per job_id — prevents data disappearing when switching jobs
  const extractedCache                      = useRef<Record<string, any>>({});
  const [clients, setClients]               = useState<any[]>([]);
  const [deliveryJobs, setDeliveryJobs]     = useState<any[]>([]);
  const [deliveryLogs, setDeliveryLogs]     = useState<any[]>([]);
  const [isInserting, setIsInserting]       = useState(false);
  const [activeTab, setActiveTab]           = useState<RightTab>('results');
  const eventEndRef = useRef<HTMLDivElement>(null);

  // ── Derived real-time metrics ─────────────────────────────────────────
  const activeCapabilities = capabilities.filter(c => c.is_active).length;
  const totalCapabilities  = capabilities.length;
  const runningJobs        = jobs.filter(j => j.status === 'running').length;
  const failedJobs         = jobs.filter(j => j.status === 'failed').length;
  const completedJobs      = jobs.filter(j => j.status === 'completed').length;
  const hitlJobs           = jobs.filter(j => j.status === 'hitl_alert').length;
  const fleetHealth        = totalCapabilities > 0 ? Math.round((activeCapabilities / totalCapabilities) * 100) : 0;
  const deliverySuccesses  = deliveryLogs.filter(l => l.status === 'success').length;
  const currentJob         = jobs.find(j => j.id === selectedJobId);

  // ── Control actions ───────────────────────────────────────────────────
  const handleUpdateJobStatus = async (newStatus: string) => {
    if (!selectedJobId) return;
    await supabase.from('research_jobs').update({ status: newStatus }).eq('id', selectedJobId);
    await supabase.from('world_events').insert([{
      job_id: selectedJobId, source: 'Command Center',
      event_type: 'human_intervention',
      message: `Fleet manager set mission to: ${newStatus}`,
      payload: { action: newStatus, ts: new Date().toISOString() }
    }]);
  };

  const handleToggleCapability = async (id: string, current: boolean) => {
    await supabase.from('capability_registry').update({ is_active: !current }).eq('id', id);
    await supabase.from('world_events').insert([{
      job_id: null, source: 'Fleet Command Center', event_type: 'system_event',
      message: `Capability ${!current ? 'ENABLED' : 'DISABLED'} by administrator`,
      payload: { capability_id: id, new_state: !current }
    }]);
  };

  // ── Global fetch & subscriptions ─────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: jd }, { data: cd }, { data: cl }, { data: dlj }, { data: dll }] = await Promise.all([
        supabase.from('research_jobs').select('*').order('created_at', { ascending: false }),
        supabase.from('capability_registry').select('*').order('name'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('delivery_jobs').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('delivery_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (jd)  setJobs(jd);
      if (cd)  setCapabilities(cd);
      if (cl)  setClients(cl);
      if (dlj) setDeliveryJobs(dlj);
      if (dll) setDeliveryLogs(dll);
    };

    const fetchGlobalEvents = async () => {
      const { data, error } = await supabase.from('world_events').select('*')
        .order('timestamp', { ascending: false }).limit(50);
      if (error) setEventsError(`world_events: ${error.message} — Check Supabase RLS policies.`);
      else { setGlobalEvents((data || []).reverse()); setEventsError(null); }
    };

    fetchAll();
    fetchGlobalEvents();

    const subs = [
      supabase.channel('jobs-ch').on('postgres_changes', { event: '*', schema: 'public', table: 'research_jobs' }, fetchAll).subscribe(),
      supabase.channel('caps-ch').on('postgres_changes', { event: '*', schema: 'public', table: 'capability_registry' }, fetchAll).subscribe(),
      supabase.channel('cli-ch').on('postgres_changes',  { event: '*', schema: 'public', table: 'clients' }, fetchAll).subscribe(),
      supabase.channel('dlj-ch').on('postgres_changes',  { event: '*', schema: 'public', table: 'delivery_jobs' }, fetchAll).subscribe(),
      supabase.channel('dll-ch').on('postgres_changes',  { event: '*', schema: 'public', table: 'delivery_logs' }, fetchAll).subscribe(),
      supabase.channel('gev-ch').on('postgres_changes',  { event: 'INSERT', schema: 'public', table: 'world_events' },
        (p: any) => setGlobalEvents(prev => [...prev, p.new])).subscribe(),
    ];
    return () => subs.forEach(s => supabase.removeChannel(s));
  }, []);

  // ── Per-job fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedJobId) return;
    const fetchDetail = async () => {
      const [{ data: evts }, { data: ext }] = await Promise.all([
        supabase.from('world_events').select('*').eq('job_id', selectedJobId).order('timestamp'),
        supabase.from('extracted_data').select('*').eq('job_id', selectedJobId).single(),
      ]);
      if (evts) setEvents(evts);
      // Cache result and only update state if data exists — never overwrite with null
      if (ext) {
        extractedCache.current[selectedJobId] = ext;
        setExtractedData(ext);
      } else {
        // Show cached version from a previous visit to this job, if available
        setExtractedData(extractedCache.current[selectedJobId] ?? null);
      }
    };
    fetchDetail();

    const evSub = supabase.channel('ev-ch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_events', filter: `job_id=eq.${selectedJobId}` },
        (p: any) => setEvents(prev => [...prev, p.new])).subscribe();

    const dataSub = supabase.channel('dat-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extracted_data', filter: `job_id=eq.${selectedJobId}` },
        (p: any) => {
          // Cache and show the live incoming payload
          extractedCache.current[selectedJobId] = p.new;
          setExtractedData(p.new);
        }).subscribe();

    return () => { supabase.removeChannel(evSub); supabase.removeChannel(dataSub); };
  }, [selectedJobId]);

  useEffect(() => { eventEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events, globalEvents]);

  // ── Test data injection ───────────────────────────────────────────────
  const injectTestData = async () => {
    setIsInserting(true);
    try {
      const { data: existingCaps } = await supabase.from('capability_registry').select('id');
      if (!existingCaps?.length) {
        await supabase.from('capability_registry').insert([
          { name: 'DOM_Extractor',      version: '2.4.1', is_active: true,  description: 'Headless playwright engine',     config: { proxy_tier: 'datacenter', timeout: 30000 } },
          { name: 'AntiBot_Shield',     version: '1.0.0', is_active: true,  description: 'Cloudflare/Datadome bypass',     config: { proxy_tier: 'residential' } },
          { name: 'LinkedIn_Auth_Silo', version: '0.9.0', is_active: false, description: 'Session authentication manager', config: { cookie_refresh: '1hr' } },
          { name: 'QA_Validator',       version: '1.2.0', is_active: true,  description: 'Schema + confidence validation', config: { min_confidence: 0.85 } },
        ]);
      }

      const { data: existingClients } = await supabase.from('clients').select('id');
      if (!existingClients?.length) {
        await supabase.from('clients').insert([
          { name: 'Acme Corp', email: 'data@acme.com', webhook_url: 'https://acme.com/hooks/data' },
          { name: 'TravelAI Ltd', email: 'api@travelai.io', webhook_url: null },
        ]);
      }

      const { data: newJob, error: je } = await supabase.from('research_jobs').insert([{
        title: 'Competitor Pricing Deep Scan', status: 'running', priority: 1,
        input_params: { domain: 'airlines.example', depth: 'deep', validate: true }
      }]).select().single();
      if (je) throw je;

      const jId = newJob.id;
      setSelectedJobId(jId);
      setActiveTab('results');

      const steps = [
        { d: 600,  e: { job_id: jId, event_type: 'decision', source: 'Orchestrator',   message: 'Evaluating domain difficulty and selecting capabilities.', payload: { domain: 'airlines.example', anti_bot_risk: 'high' } } },
        { d: 1800, e: { job_id: jId, event_type: 'action',   source: 'AntiBot_Shield', message: 'Proxies allocated — residential pool primed.',             payload: { pool_size: 15, region: 'US' } } },
        { d: 3200, e: { job_id: jId, event_type: 'warning',  source: 'DOM_Extractor',  message: 'Cloudflare challenge detected. Engaging bypass.',          payload: { challenge_type: 'js_challenge' } } },
        { d: 5000, e: { job_id: jId, event_type: 'action',   source: 'DOM_Extractor',  message: '45 price records extracted from DOM tree.',               payload: { nodes: 12400, items: 45 } } },
        { d: 6200, e: { job_id: jId, event_type: 'result',   source: 'QA_Validator',   message: 'Confidence threshold passed (98%). Committing to DB.',    payload: { confidence: 0.98 } } },
      ];
      steps.forEach(s => setTimeout(() => supabase.from('world_events').insert([s.e]), s.d));

      setTimeout(async () => {
        const { data: ed } = await supabase.from('extracted_data').insert([{
          job_id: jId, source_url: 'https://airlines.example/flights',
          confidence: 0.98, is_validated: true,
          content: { extractedItems: 45, items: [{ id: 1, flight: 'AI-202', price: 200 }, { id: 2, flight: 'EK-404', price: 340 }] }
        }]).select().single();

        const { data: clientRes } = await supabase.from('clients').select('id').limit(1).single();
        if (ed && clientRes) {
          await supabase.from('delivery_jobs').insert([{
            client_id: clientRes.id, data_id: ed.id,
            format: 'JSON', delivery_type: 'webhook', status: 'pending', retry_count: 0
          }]);
        }
        await supabase.from('research_jobs').update({ status: 'completed' }).eq('id', jId);
        setIsInserting(false);
      }, 7500);
    } catch (e) {
      console.error(e);
      alert('Insert failed — ensure Supabase RLS allows anon access.');
      setIsInserting(false);
    }
  };

  // ── Reusable components ───────────────────────────────────────────────
  const TabBtn = ({ id, icon, label, color = 'blue' }: { id: RightTab; icon: React.ReactNode; label: string; color?: string }) => {
    const colorMap: Record<string, string> = {
      blue: 'border-sky-500 text-sky-400', emerald: 'border-emerald-500 text-emerald-400',
      cyan: 'border-cyan-500 text-cyan-400', amber: 'border-amber-500 text-amber-400',
    };
    return (
      <button onClick={() => setActiveTab(id)}
        className={`px-4 py-3.5 text-xs font-semibold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap
          ${activeTab === id ? `${colorMap[color]} bg-white/[0.04]` : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'}`}>
        {icon}{label}
      </button>
    );
  };

  const EventNode = ({ evt, index, total }: { evt: any; index: number; total: number }) => {
    const isErr   = ['error', 'warning'].includes(evt.event_type);
    const isDec   = evt.event_type === 'decision';
    const isHuman = evt.event_type === 'human_intervention';
    const dotColor   = isErr ? 'bg-rose-500' : isDec ? 'bg-sky-400' : isHuman ? 'bg-purple-500' : 'bg-emerald-500';
    const borderColor = isErr ? 'border-rose-500/60' : isHuman ? 'border-purple-500/60' : 'border-white/[0.07]';
    const msgColor   = isErr ? 'text-rose-300' : isHuman ? 'text-purple-300' : 'text-slate-300';
    const typeColors: Record<string, string> = {
      decision: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
      action: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      result: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
      warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      error: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
      human_intervention: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      system_event: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    };

    return (
      <div className="relative pl-8">
        {index < total - 1 && <div className="absolute left-[14px] top-7 bottom-[-20px] w-px bg-white/[0.06]" />}
        <div className={`absolute left-[9px] top-2 w-3 h-3 rounded-full z-10 ${dotColor} shadow-lg`} />
        <div className={`event-card border ${borderColor} p-4 mb-1`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {isDec
                  ? <Bot className="w-4 h-4 text-sky-400"/>
                  : isHuman
                    ? <AlertTriangle className="w-4 h-4 text-purple-400"/>
                    : <Zap className="w-4 h-4 text-emerald-400"/>}
                <span className="text-sm font-bold text-slate-100">{evt.source}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${typeColors[evt.event_type] || typeColors['system_event']}`}>
                {evt.event_type}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className={`text-sm leading-relaxed ${msgColor}`}>{evt.message}</p>
          {evt.payload && Object.keys(evt.payload).length > 0 && (
            <pre className="mt-3 p-3 bg-black/30 rounded-lg text-xs text-sky-200/80 overflow-x-auto border border-white/[0.06] leading-relaxed">
              {JSON.stringify(evt.payload, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1800px] mx-auto flex flex-col gap-5">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="glass-panel p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/15 rounded-xl border border-sky-500/25 glow-blue">
              <Activity className="w-6 h-6 text-sky-400"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Command Center</h1>
              <p className="text-sm text-slate-400 mt-0.5">Module 5 · Live Supabase Introspection</p>
            </div>
          </div>
          <button onClick={injectTestData} disabled={isInserting}
            className="flex items-center gap-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all border border-sky-500/50 shadow-lg shadow-sky-500/20 disabled:opacity-40 text-sm">
            {isInserting ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
            Initialize Test Run
          </button>
        </div>

        {/* Real-time stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total Jobs',    val: jobs.length,       color: 'text-slate-200',  icon: <BarChart3 className="w-4 h-4 text-slate-400"/> },
            { label: 'Running',       val: runningJobs,       color: 'text-sky-400',    icon: <Activity className={`w-4 h-4 text-sky-400 ${runningJobs > 0 ? 'status-running' : ''}`}/> },
            { label: 'Completed',     val: completedJobs,     color: 'text-emerald-400',icon: <CheckCircle2 className="w-4 h-4 text-emerald-400"/> },
            { label: 'Failed',        val: failedJobs,        color: 'text-rose-400',   icon: <XCircle className="w-4 h-4 text-rose-400"/> },
            { label: 'HITL Alerts',   val: hitlJobs,          color: 'text-purple-400', icon: <AlertTriangle className={`w-4 h-4 text-purple-400 ${hitlJobs > 0 ? 'status-running' : ''}`}/> },
            { label: 'Capabilities',  val: `${activeCapabilities}/${totalCapabilities}`, color: fleetHealth >= 75 ? 'text-emerald-400' : fleetHealth >= 50 ? 'text-amber-400' : 'text-rose-400', icon: <Cpu className="w-4 h-4 text-sky-400"/> },
            { label: 'Clients',       val: clients.length,    color: 'text-cyan-400',   icon: <Users className="w-4 h-4 text-cyan-400"/> },
            { label: 'Deliveries ✓', val: deliverySuccesses, color: 'text-emerald-400', icon: <Truck className="w-4 h-4 text-emerald-400"/> },
          ].map(stat => (
            <div key={stat.label} className="stat-card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">{stat.icon}<span className="text-xs uppercase font-semibold tracking-wider text-slate-500">{stat.label}</span></div>
              <span className={`text-2xl font-bold font-mono tracking-tight ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── 3-column grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[72vh]">

        {/* Panel 1 — Active Missions */}
        <div className="lg:col-span-3 glass-panel flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <Database className="w-4 h-4 text-slate-400"/>
            <h2 className="font-semibold text-slate-100">Active Missions</h2>
            {hitlJobs > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full status-running">
                {hitlJobs} Alert
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-40 gap-3">
                <ServerCrash className="w-10 h-10 text-slate-600"/>
                <p className="text-sm text-slate-500 text-center">No missions yet.<br/>Click "Initialize Test Run".</p>
              </div>
            )}
            {jobs.map(job => (
              <div key={job.id} onClick={() => setSelectedJobId(job.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedJobId === job.id
                    ? 'bg-sky-500/10 border-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.12)]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-100 leading-snug">{job.title}</span>
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[job.status] || statusColors.pending}`}>
                    {job.status === 'hitl_alert' ? '⚠ HALT' : job.status}
                  </span>
                </div>
                {job.input_params?.domain && (
                  <p className="text-xs text-slate-500 font-mono truncate mb-3">{job.input_params.domain}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Priority {job.priority ?? 0}</span>
                  <span>{new Date(job.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2 — Audit Log */}
        <div className="lg:col-span-5 glass-panel flex flex-col overflow-hidden grid-bg relative">
          <div className="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-slate-400"/>
              <h2 className="font-semibold text-slate-100">Audit Log / World Events</h2>
              <span className="text-xs text-slate-500">
                {selectedJobId ? `Mission: ${currentJob?.title?.slice(0, 20)}…` : 'Global Feed'}
              </span>
            </div>
            {currentJob && (
              <div className="flex items-center gap-2">
                {(currentJob.status === 'running' || currentJob.status === 'pending') && (
                  <button onClick={() => handleUpdateJobStatus('failed')}
                    className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 rounded-lg transition-all">
                    <Square className="w-3 h-3"/> Stop
                  </button>
                )}
                {currentJob.status === 'hitl_alert' && (
                  <button onClick={() => handleUpdateJobStatus('running')}
                    className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg transition-all">
                    <ShieldCheck className="w-3 h-3"/> Authorize
                  </button>
                )}
                {(currentJob.status === 'failed' || currentJob.status === 'completed') && (
                  <button onClick={() => handleUpdateJobStatus('pending')}
                    className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-all">
                    <RefreshCcw className="w-3 h-3"/> Retry
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-10">
            {eventsError && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
                ⚠ {eventsError}
              </div>
            )}
            {!selectedJobId && (
              <>
                {globalEvents.length === 0 && !eventsError && (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40 gap-3">
                    <Terminal className="w-10 h-10 text-slate-600"/>
                    <p className="text-sm text-slate-500">No events yet. Click "Initialize Test Run".</p>
                  </div>
                )}
                {globalEvents.map((evt, i) => <EventNode key={evt.id || i} evt={evt} index={i} total={globalEvents.length}/>)}
              </>
            )}
            {selectedJobId && events.length === 0 && !eventsError && (
              <p className="text-sm text-slate-500 italic text-center mt-6">Waiting for agent events...</p>
            )}
            {selectedJobId && events.map((evt, i) => <EventNode key={evt.id || i} evt={evt} index={i} total={events.length}/>)}
            <div ref={eventEndRef}/>
          </div>
        </div>

        {/* Panel 3 — Tabbed Details */}
        <div className="lg:col-span-4 glass-panel flex flex-col overflow-hidden">
          <div className="flex items-center border-b border-white/[0.06] overflow-x-auto shrink-0">
            <TabBtn id="results"  icon={<Binary className="w-4 h-4"/>}    label="Results"   color="blue"/>
            <TabBtn id="fleet"    icon={<Settings2 className="w-4 h-4"/>}  label="Fleet"     color="emerald"/>
            <TabBtn id="clients"  icon={<Users className="w-4 h-4"/>}     label="Clients"   color="cyan"/>
            <TabBtn id="delivery" icon={<Truck className="w-4 h-4"/>}     label="Delivery"  color="amber"/>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ─ Results ─ */}
            {activeTab === 'results' && (
              <div className="p-5 h-full">
                {!selectedJobId ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 gap-3">
                    <FileCode className="w-10 h-10 text-slate-600"/>
                    <p className="text-sm text-slate-500 text-center">Select a mission<br/>to inspect extracted data.</p>
                  </div>
                ) : !extractedData ? (
                  <div className="h-[180px] flex flex-col items-center justify-center opacity-40 gap-3">
                    <Clock className="w-8 h-8 text-slate-600"/>
                    <p className="text-sm text-slate-500">Awaiting Module 3 payload...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-slate-400 truncate pr-3">{extractedData.source_url}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${extractedData.is_validated ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                          {extractedData.is_validated ? <ShieldCheck className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5"/>}
                          {extractedData.is_validated ? 'Validated' : 'Unverified'}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 pt-1">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Confidence</p>
                          <span className="text-lg font-bold font-mono text-sky-300">{((extractedData.confidence || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Items Extracted</p>
                          <span className="text-lg font-bold font-mono text-slate-200">{extractedData.content?.extractedItems ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-slate-300">Content Payload</span>
                        <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full font-mono border border-white/[0.07] text-slate-400">JSONB</span>
                      </div>
                      <pre className="p-4 bg-black/40 border border-white/[0.06] rounded-xl text-xs text-amber-200/80 font-mono overflow-auto h-[340px] leading-relaxed">
                        {JSON.stringify(extractedData.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─ Fleet ─ */}
            {activeTab === 'fleet' && (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="stat-card p-4">
                    <div className="flex justify-between text-slate-400 mb-2"><span className="text-xs font-semibold uppercase">Active</span><Cpu className="w-4 h-4 text-sky-400"/></div>
                    <span className="text-2xl font-bold font-mono text-slate-100">{activeCapabilities}<span className="text-slate-500 text-base">/{totalCapabilities}</span></span>
                    <p className="text-xs text-slate-500 mt-1">{runningJobs} mission{runningJobs !== 1 ? 's' : ''} live</p>
                  </div>
                  <div className="stat-card p-4">
                    <div className="flex justify-between text-slate-400 mb-2"><span className="text-xs font-semibold uppercase">Fleet Health</span><Wifi className={`w-4 h-4 ${fleetHealth >= 75 ? 'text-emerald-400' : fleetHealth >= 50 ? 'text-amber-400' : 'text-rose-400'}`}/></div>
                    <span className={`text-2xl font-bold font-mono ${fleetHealth >= 75 ? 'text-emerald-400' : fleetHealth >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {totalCapabilities === 0 ? 'N/A' : `${fleetHealth}%`}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{fleetHealth >= 75 ? 'Optimal' : fleetHealth >= 50 ? 'Degraded' : 'Critical'}</p>
                  </div>
                </div>
                <p className="text-xs uppercase text-slate-500 font-semibold tracking-wider mb-3">Module Capabilities</p>
                {capabilities.length === 0 ? (
                  <div className="border border-dashed border-white/[0.08] rounded-xl p-5 text-center text-sm text-slate-500">No capabilities registered</div>
                ) : capabilities.map(cap => (
                  <div key={cap.id} className="capability-card p-4 mb-3 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cap.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}/>
                    <div className="pl-4 flex justify-between gap-3">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100 font-mono">{cap.name}</span>
                          <span className="text-xs text-slate-500">v{cap.version}</span>
                        </div>
                        <span className="text-xs text-slate-400">{cap.description}</span>
                        {cap.config && Object.keys(cap.config).length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {Object.entries(cap.config).map(([k, v]) => (
                              <span key={k} className="text-xs px-2 py-0.5 bg-black/30 border border-white/[0.07] rounded-full font-mono">
                                <span className="text-sky-400/80">{k}:</span> {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleToggleCapability(cap.id, cap.is_active)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                          ${cap.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-white/[0.04] text-slate-500 border-white/[0.08] hover:bg-white/[0.07]'}`}>
                        <Power className="w-3 h-3"/>
                        {cap.is_active ? 'Online' : 'Offline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─ Clients ─ */}
            {activeTab === 'clients' && (
              <div className="p-5">
                <p className="text-xs uppercase text-slate-500 font-semibold tracking-wider mb-3">Registered Clients ({clients.length})</p>
                {clients.length === 0 ? (
                  <div className="border border-dashed border-white/[0.08] rounded-xl p-5 text-center text-sm text-slate-500">No clients registered</div>
                ) : clients.map(client => (
                  <div key={client.id} className="capability-card p-4 mb-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                        <span className="text-sm font-bold text-cyan-400">{client.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-100">{client.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{client.id.split('-')[0]}...</p>
                      </div>
                    </div>
                    {client.email && <p className="text-xs text-slate-400 mb-1.5">✉ {client.email}</p>}
                    {client.webhook_url
                      ? <p className="text-xs text-sky-400 font-mono truncate mb-2">⚡ {client.webhook_url}</p>
                      : <p className="text-xs text-slate-600 italic mb-2">No webhook configured</p>}
                    <div className="flex gap-4 pt-2 border-t border-white/[0.05] text-xs">
                      <span className="text-emerald-400 font-semibold">{deliveryLogs.filter(l => l.client_id === client.id && l.status === 'success').length} delivered</span>
                      <span className="text-rose-400 font-semibold">{deliveryLogs.filter(l => l.client_id === client.id && ['error', 'failed'].includes(l.status)).length} failed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─ Delivery ─ */}
            {activeTab === 'delivery' && (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="stat-card p-4">
                    <div className="flex justify-between text-slate-400 mb-2"><span className="text-xs font-semibold uppercase">Queued</span><Clock className="w-4 h-4 text-amber-400"/></div>
                    <span className="text-2xl font-bold font-mono text-amber-400">{deliveryJobs.filter(d => d.status === 'pending').length}</span>
                  </div>
                  <div className="stat-card p-4">
                    <div className="flex justify-between text-slate-400 mb-2"><span className="text-xs font-semibold uppercase">Delivered</span><CheckCircle2 className="w-4 h-4 text-emerald-400"/></div>
                    <span className="text-2xl font-bold font-mono text-emerald-400">{deliverySuccesses}</span>
                  </div>
                </div>
                <p className="text-xs uppercase text-slate-500 font-semibold tracking-wider mb-3">Delivery Queue</p>
                {deliveryJobs.length === 0 ? (
                  <div className="border border-dashed border-white/[0.08] rounded-xl p-5 text-center text-sm text-slate-500">No delivery jobs queued</div>
                ) : deliveryJobs.map(dj => (
                  <div key={dj.id} className="capability-card p-4 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-400"/>
                        <span className="text-sm font-semibold text-slate-200">{dj.format} via {dj.delivery_type}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[dj.status || 'pending'] || statusColors.pending}`}>{dj.status}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>Retries: <span className={dj.retry_count > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>{dj.retry_count ?? 0}</span></span>
                      {dj.scheduled_at && <span>⏰ {new Date(dj.scheduled_at).toLocaleTimeString()}</span>}
                    </div>
                  </div>
                ))}
                {deliveryLogs.length > 0 && (
                  <>
                    <p className="text-xs uppercase text-slate-500 font-semibold tracking-wider mb-3 mt-5">Recent Logs</p>
                    {deliveryLogs.slice(0, 8).map(dl => (
                      <div key={dl.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] text-xs">
                        <div className="flex items-center gap-2">
                          {dl.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> : <XCircle className="w-3.5 h-3.5 text-rose-400"/>}
                          <span className="font-mono text-slate-300">{dl.format} → {dl.delivery_type}</span>
                        </div>
                        <span className="text-slate-500">{new Date(dl.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
