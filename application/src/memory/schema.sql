-- Supabase Schema for Agentic Kernel World Model
-- Matches actual production Supabase tables (confirmed via REST API probe)

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    input JSONB NOT NULL,
    output_goal TEXT[] NOT NULL,
    status TEXT NOT NULL,
    governance JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. World Events Table
CREATE TABLE IF NOT EXISTS public.world_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT,
    payload JSONB NOT NULL
);

-- 3. Artifacts Table
CREATE TABLE IF NOT EXISTS public.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    produced_by TEXT NOT NULL,
    content JSONB NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Metrics Table
CREATE TABLE IF NOT EXISTS public.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    name TEXT NOT NULL,
    value FLOAT NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Errors Table
CREATE TABLE IF NOT EXISTS public.errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    retriable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Workflow States Table
CREATE TABLE IF NOT EXISTS public.workflow_states (
    workflow_id TEXT PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
    current_status TEXT NOT NULL,
    completed_stages TEXT[] DEFAULT '{}',
    pending_stages TEXT[] DEFAULT '{}',
    failed_stages TEXT[] DEFAULT '{}',
    routing_history JSONB DEFAULT '[]',
    confidence_history JSONB DEFAULT '[]',
    decision_history JSONB DEFAULT '[]',
    justifications TEXT[] DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);
