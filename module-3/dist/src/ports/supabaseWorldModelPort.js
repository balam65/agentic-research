"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseWorldModelPort = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
function resolveServiceRoleKey() {
    return (process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.ANOTHERKEY ??
        process.env.anotherkey);
}
class SupabaseWorldModelPort {
    client;
    constructor(url, serviceRoleKey) {
        this.client = (0, supabase_js_1.createClient)(url, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    }
    static fromEnv() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = resolveServiceRoleKey();
        if (!url || !key) {
            throw new Error("Missing Supabase environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANOTHERKEY).");
        }
        return new SupabaseWorldModelPort(url, key);
    }
    async initJob(record) {
        const row = {
            id: record.id,
            title: record.title,
            status: record.status ?? "pending",
            input_params: record.input_params,
            priority: record.priority ?? 0
        };
        await this.insertOrThrow("research_jobs", row);
    }
    async updateJobStatus(jobId, status) {
        const { error } = await this.client
            .from("research_jobs")
            .update({ status })
            .eq("id", jobId);
        if (error)
            throw new Error(`Failed to update research_jobs status: ${error.message}`);
    }
    async updateJobFinalOutput(jobId, finalOutputUrl) {
        const { error } = await this.client
            .from("research_jobs")
            .update({ final_output_url: finalOutputUrl })
            .eq("id", jobId);
        if (error)
            throw new Error(`Failed to update research_jobs final output: ${error.message}`);
    }
    async saveExtractedData(record) {
        const row = {
            job_id: record.job_id,
            source_url: record.source_url,
            content: record.content,
            confidence: record.confidence,
            is_validated: record.is_validated ?? false
        };
        await this.insertOrThrow("extracted_data", row);
    }
    async markLatestExtractedDataValidated(jobId) {
        const { data, error } = await this.client
            .from("extracted_data")
            .select("id")
            .eq("job_id", jobId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            throw new Error(`Failed to read latest extracted_data row: ${error.message}`);
        if (!data?.id)
            return;
        const { error: updateError } = await this.client
            .from("extracted_data")
            .update({ is_validated: true })
            .eq("id", data.id);
        if (updateError)
            throw new Error(`Failed to update extracted_data validation flag: ${updateError.message}`);
    }
    async registerCapabilities(capabilities) {
        if (capabilities.length === 0)
            return;
        const rows = capabilities.map((capability) => ({
            name: capability.name,
            version: "1.0.0",
            is_active: true,
            description: `Module 3 capability: ${capability.name}`,
            config: {
                consumes: capability.consumes,
                produces: capability.produces
            }
        }));
        const { error } = await this.client
            .from("capability_registry")
            .upsert(rows, { onConflict: "name" });
        if (error)
            throw new Error(`Failed to upsert capability_registry: ${error.message}`);
    }
    async writeEvent(event) {
        const row = {
            job_id: event.job_id,
            event_type: event.event_name,
            source: this.inferSource(event),
            message: event.justification,
            payload: {
                ...event.payload,
                confidence_score: event.confidence_score ?? null
            }
        };
        await this.insertOrThrow("world_events", row);
    }
    async readState(key) {
        const { data, error } = await this.client
            .from("research_jobs")
            .select("input_params")
            .eq("id", key)
            .maybeSingle();
        if (error)
            throw new Error(`Failed to read state for key ${key}: ${error.message}`);
        return data?.input_params ?? undefined;
    }
    async writeState(key, value) {
        const { error } = await this.client
            .from("research_jobs")
            .update({ input_params: value })
            .eq("id", key);
        if (error)
            throw new Error(`Failed to write state for key ${key}: ${error.message}`);
    }
    inferSource(event) {
        if (event.event_name === "input_received" || event.event_name === "delivery_handoff_ready") {
            return "pipeline_engine";
        }
        if (event.event_name === "hitl_required") {
            return "hitl_policy_engine";
        }
        const prefix = event.event_name.split("_")[0];
        return prefix || "pipeline_engine";
    }
    async insertOrThrow(table, row) {
        const { error } = await this.client.from(table).insert(row);
        if (error)
            throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }
}
exports.SupabaseWorldModelPort = SupabaseWorldModelPort;
