import "dotenv/config";

import { PipelineEngine } from "./runtime/pipelineEngine";
import { SupabaseWorldModelPort } from "./ports/supabaseWorldModelPort";
import type { PipelineInput } from "./types/contracts";

async function main(): Promise<void> {
  const useSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ANOTHERKEY || process.env.anotherkey);

  const worldModel = useSupabase ? SupabaseWorldModelPort.fromEnv() : undefined;
  console.log(`[module-3 demo] Mode: ${useSupabase ? "Supabase" : "InMemory"}`);

  const engine = new PipelineEngine({ worldModel });
  const input: PipelineInput = {
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
