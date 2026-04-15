import 'dotenv/config';

import { createLogger } from './logs/logger.js';
import { PipelineEngine } from './workflows/pipeline_engine.js';
import { SupabaseDurableStatePort } from './memory/supabase_durable_port.js';
import type { PipelineInput } from './utils/contracts.js';

const logger = createLogger('demo');

async function main(): Promise<void> {
  const useSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ANOTHERKEY || process.env.anotherkey);

  logger.info('Demo starting', { mode: useSupabase ? 'supabase' : 'in-memory' });

  const engine = new PipelineEngine();
  const input: PipelineInput = {
    target_domain: 'example.com',
    extracted_schema_definition: {
      title: 'string',
      content: 'string',
      source_url: 'string',
    },
    budget_or_time_constraints: {
      max_minutes: 45,
    },
  };

  const output = await engine.run(input);
  console.log(JSON.stringify(output, null, 2));
  logger.info('Demo completed', { nextAction: output.next_action });
}

main().catch((error) => {
  logger.error('Demo pipeline failed', error instanceof Error ? error : new Error(String(error)));
  process.exitCode = 1;
});
