import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldCheck, Database, GitBranch, Terminal, Globe, Plus, Cpu, Layers, Beaker, FileCode, ServerCrash, Send, Bot, Zap, Play, Square, RefreshCcw } from 'lucide-react';
import { supabase } from './lib/supabase';
// Helper to determine status color
const statusColors = {
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    running: 'text-brand-400 bg-brand-400/10 border-brand-400/20',
    failed: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
};
export default function App() {
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [outputData, setOutputData] = useState(null);
    const [isInserting, setIsInserting] = useState(false);
    const eventEndRef = useRef(null);
    // 1. Fetch initial jobs & subscribe
    useEffect(() => {
        const fetchJobs = async () => {
            const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
            if (data)
                setJobs(data);
        };
        fetchJobs();
        const jobsSub = supabase.channel('table-jobs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
            fetchJobs(); // Simple refresh for now
        }).subscribe();
        return () => {
            supabase.removeChannel(jobsSub);
        };
    }, []);
    // 2. Fetch logs and data when job selected
    useEffect(() => {
        if (!selectedJobId)
            return;
        const fetchDetail = async () => {
            const { data: logData } = await supabase.from('logs').select('*').eq('job_id', selectedJobId).order('timestamp', { ascending: true });
            if (logData)
                setLogs(logData);
            const { data: outputRes } = await supabase.from('data').select('*').eq('job_id', selectedJobId).single();
            if (outputRes)
                setOutputData(outputRes);
            else
                setOutputData(null);
        };
        fetchDetail();
        const logsSub = supabase.channel('table-logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs', filter: `job_id=eq.${selectedJobId}` }, (payload) => {
            setLogs(prev => [...prev, payload.new]);
        }).subscribe();
        const dataSub = supabase.channel('table-data')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'data', filter: `job_id=eq.${selectedJobId}` }, (payload) => {
            setOutputData(payload.new);
        }).subscribe();
        return () => {
            supabase.removeChannel(logsSub);
            supabase.removeChannel(dataSub);
        };
    }, [selectedJobId]);
    // Auto-scroll logic array
    useEffect(() => {
        eventEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);
    // Generate Test Data to prove it works
    const injectTestData = async () => {
        setIsInserting(true);
        try {
            // Create new job
            const { data: newJob, error: jobErr } = await supabase.from('jobs').insert([{ status: 'running' }]).select().single();
            if (jobErr)
                throw jobErr;
            const jId = newJob.id;
            setSelectedJobId(jId);
            // We use a progressive timeout to simulate agent thinking
            const steps = [
                { d: 500, log: { job_id: jId, step_name: 'orchestrator', message: 'Received target. Assessing extraction requirements.', log_level: 'info' } },
                { d: 1500, log: { job_id: jId, step_name: 'orchestrator', message: 'Target requires proxy bypass. Calling ProxyManager.', log_level: 'info' } },
                { d: 3000, log: { job_id: jId, step_name: 'proxy_agent', message: 'Allocated residential IP pool.', log_level: 'info' } },
                { d: 5000, log: { job_id: jId, step_name: 'extraction_agent', message: 'DOM tree analyzed. Found 45 items matching product signature.', log_level: 'info' } },
                { d: 6000, log: { job_id: jId, step_name: 'qa_agent', message: 'Validation passed (100% confidence). Committing data.', log_level: 'info' } },
            ];
            for (const step of steps) {
                setTimeout(async () => {
                    await supabase.from('logs').insert([step.log]);
                }, step.d);
            }
            setTimeout(async () => {
                await supabase.from('data').insert([{ job_id: jId, raw_data: { payloadSize: "4kb", nodeCount: 45 }, processed_data: { status: 'success', extractedItems: 45, items: [{ id: 1, val: "Item A" }, { id: 2, val: "Item B" }] } }]);
                await supabase.from('jobs').update({ status: 'completed' }).eq('id', jId);
                setIsInserting(false);
            }, 7000);
        }
        catch (e) {
            console.error(e);
            alert("Failed to insert dummy data: check console/RLS policies.");
            setIsInserting(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 text-sm", children: [_jsxs("header", { className: "flex items-center justify-between glass-panel p-5", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-2.5 bg-brand-500/20 rounded-lg border border-brand-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]", children: _jsx(Activity, { className: "w-5 h-5 text-brand-400" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold tracking-tight text-white", children: "Agentic Observability" }), _jsx("p", { className: "text-xs text-slate-400 font-medium mt-1", children: "Live Database Introspection" })] })] }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("button", { onClick: injectTestData, disabled: isInserting, className: "flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-lg transition-colors border border-brand-500/50 shadow-lg shadow-brand-500/20 disabled:opacity-50", children: [isInserting ? _jsx(RefreshCcw, { className: "w-4 h-4 animate-spin" }) : _jsx(Play, { className: "w-4 h-4" }), "Inject Test Mission Data"] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-[75vh]", children: [_jsxs("div", { className: "lg:col-span-3 glass-panel p-0 flex flex-col overflow-hidden", children: [_jsx("div", { className: "p-4 border-b border-dark-700 bg-dark-800/50", children: _jsxs("h2", { className: "font-semibold flex items-center gap-2 text-slate-200", children: [_jsx(Database, { className: "w-4 h-4 text-slate-400" }), "Agent Missions"] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-3 space-y-2", children: [jobs.length === 0 && _jsx("p", { className: "text-slate-500 text-xs italic text-center mt-4", children: "No jobs in database" }), jobs.map(job => (_jsxs("div", { onClick: () => setSelectedJobId(job.id), className: `p-3 rounded border cursor-pointer transition-all ${selectedJobId === job.id
                                            ? 'bg-dark-700 border-brand-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                            : 'bg-dark-800/30 border-dark-700 hover:border-dark-500 hover:bg-dark-800'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("span", { className: "font-mono text-[10px] text-slate-400 truncate w-32", children: [job.id.split('-')[0], "..."] }), _jsx("span", { className: `text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusColors[job.status] || statusColors.pending}`, children: job.status })] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Created: ", new Date(job.created_at).toLocaleTimeString()] })] }, job.id)))] })] }), _jsxs("div", { className: "lg:col-span-5 glass-panel p-0 flex flex-col relative overflow-hidden", children: [_jsx("div", { className: "p-4 border-b border-dark-700 bg-dark-800/50 flex justify-between items-center z-10 relative", children: _jsxs("h2", { className: "font-semibold flex items-center gap-2 text-slate-200", children: [_jsx(Terminal, { className: "w-4 h-4 text-slate-400" }), "Agent Cognitive Trace"] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-5 space-y-5 relative z-10 bg-dark-900/50", children: [!selectedJobId && (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-slate-500 opacity-60", children: [_jsx(Cpu, { className: "w-10 h-10 mb-3 text-slate-600" }), _jsx("p", { children: "Select a mission to view real-time logs." })] })), selectedJobId && logs.length === 0 && (_jsx("p", { className: "text-slate-500 text-xs italic text-center mt-4", children: "Waiting for agent events..." })), logs.map((log, index) => {
                                        // Parse Event Types if columns exist (Agentic model upgrade)
                                        const eventType = log.event_type || 'action';
                                        const isError = log.log_level === 'error';
                                        const isDecision = eventType === 'decision';
                                        return (_jsxs("div", { className: "relative pl-7 group", children: [index !== logs.length - 1 && (_jsx("div", { className: "absolute left-[13px] top-6 bottom-[-20px] w-[1px] bg-dark-600" })), _jsx("div", { className: `absolute left-[8px] top-1.5 w-[11px] h-[11px] rounded-full z-10 shadow-[0_0_10px_currentColor]
                    ${isError ? 'bg-rose-500 text-rose-500' : isDecision ? 'bg-brand-400 text-brand-400' : 'bg-emerald-500 text-emerald-500'}
                  ` }), _jsxs("div", { className: `bg-dark-800 border-l-2 rounded-r p-3 ${isError ? 'border-rose-500' : 'border-slate-600'}`, children: [_jsxs("div", { className: "flex justify-between items-start mb-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [isDecision ? _jsx(Bot, { className: "w-3.5 h-3.5 text-brand-400" }) : _jsx(Zap, { className: "w-3.5 h-3.5 text-emerald-400" }), _jsx("span", { className: "text-xs text-slate-300 font-bold tracking-wide", children: log.step_name || 'System' })] }), _jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: new Date(log.timestamp).toLocaleTimeString() })] }), _jsx("p", { className: `text-[11px] font-mono mt-2 ${isError ? 'text-rose-300' : 'text-slate-400'}`, children: log.message }), log.payload && (_jsx("pre", { className: "mt-2 p-2 bg-dark-900 rounded text-[10px] text-brand-200 overflow-x-auto border border-dark-700", children: JSON.stringify(log.payload, null, 2) }))] })] }, log.id));
                                    }), _jsx("div", { ref: eventEndRef })] })] }), _jsxs("div", { className: "lg:col-span-4 glass-panel p-0 flex flex-col", children: [_jsx("div", { className: "p-4 border-b border-dark-700 bg-dark-800/50", children: _jsxs("h2", { className: "font-semibold flex items-center gap-2 text-slate-200", children: [_jsx(Layers, { className: "w-4 h-4 text-slate-400" }), "World Model State (Data)"] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-4 bg-dark-900/30", children: !selectedJobId ? (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-slate-500 opacity-60", children: [_jsx(FileCode, { className: "w-10 h-10 mb-3 text-slate-600" }), _jsx("p", { children: "Results will appear here." })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "text-xs font-semibold text-slate-400", children: "Export Final Object" }), _jsx("span", { className: "text-[10px] bg-dark-700 px-2 py-0.5 rounded border border-dark-600", children: "JSONB" })] }), !outputData ? (_jsx("div", { className: "p-4 border border-dashed border-dark-600 rounded text-center text-slate-500 text-xs", children: "Awaiting data payload..." })) : (_jsx("pre", { className: "p-4 bg-dark-900 border border-dark-700 rounded text-amber-200/90 text-[11px] font-mono overflow-auto shadow-inner h-[500px]", children: JSON.stringify(outputData.processed_data || outputData.raw_data || outputData, null, 2) }))] })) })] })] })] }));
}
//# sourceMappingURL=App.js.map