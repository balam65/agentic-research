import { z } from 'zod';

// Define the incoming raw requirement schema from the User / API
export const JobRequestSchema = z.object({
  target: z.object({
    url_or_domain: z.string().url({ message: "Invalid URL provided." }).or(z.string().min(3)),
    scope: z.enum(["product_pages", "category_pages", "search_results", "entire_site", "unknown"]).default("unknown"),
  }),
  constraints: z.object({
    max_time_ms: z.number().int().positive().optional(),
    requires_js_rendering: z.boolean().default(false),
    human_in_loop_required: z.boolean().default(false),
    proxy_tier: z.enum(["datacenter", "residential", "mobile", "unknown"]).default("datacenter").describe("Tier of proxy needed based on target difficulty."),
    anti_bot_risk: z.enum(["low", "medium", "high", "unknown"]).default("low").describe("Estimated anti-bot complexity of target domain."),
    authentication_required: z.boolean().default(false).describe("Whether target domain inherently requires a login session (e.g. LinkedIn).")
  }).default({}),
  search_parameters: z.record(z.string(), z.string()).optional().describe("Dynamic parameters the webscraper needs to inject or search for."),
  intent_context: z.string().optional().describe("Concise summary of the overall scraping intent."),
  expected_schema: z.record(z.string(), z.string()).optional().describe("A key-value map representing the expected JSON columns/datatypes from extraction. E.g. { 'price': 'number' }"),
});

// Define the precise Output format for Module 2 (Routing & Intelligence)
export interface ValidatedModuleEvent {
  event_id: string;
  event_type: 'INPUT_CONTRACT_VALIDATED';
  timestamp: string;
  payload: z.infer<typeof JobRequestSchema>;
  confidence_score: number;
  justification: string;
}
