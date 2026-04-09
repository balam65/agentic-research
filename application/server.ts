import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";
import { v4 as uuidv4 } from "uuid";

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
    "proxy_tier": "string (datacenter | residential | isp) based on site difficulty",
    "anti_bot_risk": "string (low | medium | high) based on site defense",
    "authentication_required": false
  },
  "expected_schema": {
    "column_name": "datatype"
  }
}
DO NOT output conversational text, markdown blocks, or anything outside of the JSON object.
`;

// Initialize environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
            })
        });

        if (!openRouterRes.ok) {
            throw new Error(`OpenRouter API emitted status ${openRouterRes.status}`);
        }

        const data = await openRouterRes.json();
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

        // Step 4: Event Constructor & Validation (Module 2 Wrapping)
        const eventId = `req-${uuidv4().substring(0,8)}`;
        const finalWorldModelEvent = {
            event_id: eventId,
            event_type: "INPUT_CONTRACT_VALIDATED",
            timestamp: new Date().toISOString(),
            payload: parsedPayload,
            confidence_score: 1.0,
            justification: "Requirement conversationally processed and structured via LLM Server."
        };

        // Step 5: Webhook Dispatch to Module 2
        /*
        // Here is how you push to Module 2 in production:
        try {
            await fetch("http://module-2/api/events", {
                method: "POST",
                body: JSON.stringify(finalWorldModelEvent)
            });
            console.log("Successfully pushed to Module 2!");
        } catch (targetErr) {
            console.error("Module 2 is offline, but JSON is structured correctly.");
        }
        */

        // Return the final payload for manual checking in Swagger Docs or custom UI
        return res.status(200).json(finalWorldModelEvent);

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
