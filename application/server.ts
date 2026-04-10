import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";
import { v4 as uuidv4 } from "uuid";
import { JobRequestSchema } from "./src/module_1/schema";
import { OrchestratorRouter } from "./src/orchestrator/router";
import { ValidatedInputEvent } from "./src/world_model/schema";

const SYSTEM_PROMPT = `
You are the "Input Contract Module" (Module 1) for an Elite Web Scraping framework. 
Your goal is to parse the user's natural language requests and output STRICT JSON describing the constraints and targets for Module 2.

RULE 1: If the user HAS NOT specified a clear target website/domain to scrape (e.g. "Scrape shoes"), you MUST output ONLY a JSON object asking for clarification:
{
  "clarifying_question": "string (e.g., 'Which website did you want me to scrape these shoes from?')"
}

RULE 2: If the target domain IS clear and sufficient context exists, you MUST output the strict Data Payload matching this exact structure:
{
  "target": {
    "url_or_domain": "string (e.g. airindia.com)",
    "scope": "string (search_results | product_pages | category_pages | entire_site | unknown)"
  },
  "search_parameters": {
    // A dynamic key-value map. Example: "origin": "Delhi", "destination": "Detroit", "date": "coming saturday"
  },
  "intent_context": "string (Plain text summary of their goal)",
    "constraints": {
      "max_time_ms": 120000,
      "requires_js_rendering": true,
      "human_in_loop_required": false,
      "proxy_tier": "string (datacenter | residential | mobile | unknown) based on site difficulty",
      "anti_bot_risk": "string (low | medium | high | unknown) based on site defense",
      "authentication_required": false
    },
    "expected_schema": {
    "column_name": "datatype"
  }
}
DO NOT output conversational text, markdown blocks, or anything outside of the JSON object.
`;

// Initialize environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 8000;
const orchestratorRouter = new OrchestratorRouter();

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Load Swagger UI Docs (FastAPI identical UI concept)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// The Core Module 1 API Gateway
app.post("/api/v1/intake", async (req, res) => {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid payload. Needs an array of chat 'messages'." });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
        return res.status(500).json({ error: "Server Configuration Error: OPENROUTER_API_KEY is missing from .env" });
    }

    try {
        // Step 1: Forward conversational context securely to LLM
        // We prepend the SYSTEM_PROMPT to ensure the LLM follows instructions
        const baseURL = process.env.MODEL_BASE_URL || "https://openrouter.ai/api";
        const endpoint = process.env.MODEL_CHAT_ENDPOINT || "/v1/chat/completions";
        const modelName = process.env.MODEL_NAME || "openai/gpt-4o-mini";
        const customApiKey = process.env.MODEL_API_KEY || apiKey;
        const targetUrl = `${baseURL}${endpoint}`;

        const axios = require("axios");
        const openRouterRes = await axios.post(targetUrl, {
            model: modelName,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
        }, {
            headers: {
                "Authorization": `Bearer ${customApiKey}`,
                "Content-Type": "application/json"
            },
            validateStatus: () => true
        });

        if (openRouterRes.status < 200 || openRouterRes.status >= 300) {
            throw new Error(`OpenRouter API emitted status ${openRouterRes.status}`);
        }

        const data = openRouterRes.data;
        const llmContent = data.choices[0].message.content;

        // Step 2: Extract JSON 
        let parsedPayload;
        try {
            // Robust cleaning: find the first { and last }
            const startIndex = llmContent.indexOf('{');
            const endIndex = llmContent.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) throw new Error("No JSON found");
            
            let cleanString = llmContent.substring(startIndex, endIndex + 1);
            parsedPayload = JSON.parse(cleanString);
        } catch(e) {
            console.error("LLM Output Parsing Failed. RAW RESPONSE:", llmContent);
            return res.status(500).json({ error: "LLM Hallucinated non-JSON output.", raw: llmContent });
        }

        // Step 3: Rules Enforcement
        
        // If Clarifying Question is true, return it to the UI (Not a Module 2 Handoff yet)
        if (parsedPayload.clarifying_question) {
            return res.status(200).json(parsedPayload);
        }

        // Step 4: Validate and normalize the Module 1 payload for the intelligence layer
        const validatedPayload = JobRequestSchema.parse(parsedPayload);
        const eventId = `req-${uuidv4().substring(0,8)}`;
        const normalizedConstraints: ValidatedInputEvent["payload"]["constraints"] = {
            requires_js_rendering: validatedPayload.constraints.requires_js_rendering,
            human_in_loop_required: validatedPayload.constraints.human_in_loop_required,
            proxy_tier: validatedPayload.constraints.proxy_tier,
            anti_bot_risk: validatedPayload.constraints.anti_bot_risk,
            authentication_required: validatedPayload.constraints.authentication_required
        }

        if (validatedPayload.constraints.max_time_ms !== undefined) {
            normalizedConstraints.max_time_ms = validatedPayload.constraints.max_time_ms;
        }

        const finalWorldModelEvent: ValidatedInputEvent = {
            event_id: eventId,
            event_type: "INPUT_CONTRACT_VALIDATED",
            timestamp: new Date().toISOString(),
            payload: {
                target: {
                    url_or_domain: validatedPayload.target.url_or_domain,
                    scope: validatedPayload.target.scope
                },
                search_parameters: validatedPayload.search_parameters ?? {},
                intent_context: validatedPayload.intent_context ?? "",
                constraints: normalizedConstraints,
                expected_schema: validatedPayload.expected_schema ?? {}
            },
            confidence_score: 1.0,
            justification: "Requirement conversationally processed and structured via LLM Server."
        };

        // Step 5: Hand the validated Module 1 event to the intelligence layer
        const workflowRun = await orchestratorRouter.handleEvent(finalWorldModelEvent);

        // Return the Module 1 event plus the integrated workflow result
        return res.status(200).json({
            module_1_event: finalWorldModelEvent,
            workflow_result: workflowRun,
            routing_decision: workflowRun.last_decision
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Fatal Internal Error processing LLM Intent." });
    }
});

// Start Server
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`\n============================================`);
    console.log(`🚀 Module 1 Backend Server Running`);
    console.log(`🔗 Local Testing:   http://localhost:${PORT}`);
    console.log(`🔗 Swagger UI Docs: http://localhost:${PORT}/docs`);
    console.log(`============================================\n`);
});
