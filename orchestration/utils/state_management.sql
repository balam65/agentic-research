-- state_management.sql
-- DB: PostgreSQL / Supabase
-- Purpose: Persistent state tracking for the 14-agent research workflow.

CREATE TYPE job_status AS ENUM (
    'PENDING', 
    'ASSESSMENT_ACTIVE', 
    'ASSESSMENT_COMPLETE', 
    'DISCOVERY_ACTIVE', 
    'DISCOVERY_COMPLETE', 
    'EXTRACTION_ACTIVE', 
    'TRANSFORMATION_ACTIVE', 
    'QA_ACTIVE', 
    'COMPLETED', 
    'FAILED'
);

-- Main Job Execution Table
CREATE TABLE IF NOT EXISTS job_runs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_hash TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_status job_status DEFAULT 'PENDING',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    research_brief JSONB  -- Generated during Assessment/Interrogation
);

-- Agent Handoff Log (Traceability)
CREATE TABLE IF NOT EXISTS agent_handoffs (
    handoff_id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES job_runs(job_id),
    source_agent TEXT NOT NULL,  -- e.g., 'Master', 'Assessment', 'Discovery'
    target_agent TEXT NOT NULL,
    handoff_payload JSONB,
    handoff_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Source Registry & Script Repository (Discovery & Onboarding)
CREATE TABLE IF NOT EXISTS source_registry (
    source_id SERIAL PRIMARY KEY,
    domain_name TEXT UNIQUE NOT NULL,
    is_known BOOLEAN DEFAULT FALSE,
    complexity_score INT CHECK (complexity_score BETWEEN 1 AND 10),
    evasion_config JSONB,
    css_selectors JSONB,  -- Phase 2: Automated Parser Storage
    version_number TEXT DEFAULT '1.0.0',
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, DEPRECATED
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sentinel Monitoring (SLA tracking)
CREATE TABLE IF NOT EXISTS sentinel_logs (
    log_id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES job_runs(job_id),
    agent_name TEXT,
    latency_ms INT,
    error_message TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
