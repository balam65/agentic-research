"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pipelineEngine_1 = require("./runtime/pipelineEngine");
const supabaseWorldModelPort_1 = require("./ports/supabaseWorldModelPort");
async function main() {
    const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ANOTHERKEY || process.env.anotherkey);
    const worldModel = useSupabase ? supabaseWorldModelPort_1.SupabaseWorldModelPort.fromEnv() : undefined;
    console.log(`[module-3 demo] Mode: ${useSupabase ? "Supabase" : "InMemory"}`);
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const input = {
        target_domain: "example.com",
        extracted_schema_definition: {
            title: "string",
            content: "string",
            source_url: "string"
        },
        budget_or_time_constraints: {
            max_minutes: 45
        }
    };
    const output = await engine.run(input);
    console.log(JSON.stringify(output, null, 2));
}
main().catch((error) => {
    console.error("Demo pipeline failed:", error);
    process.exitCode = 1;
});
