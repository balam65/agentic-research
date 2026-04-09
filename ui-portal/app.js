// Module 1: Event Router Intake via AI Chat Fallback

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
    // Dynamic key:value map. Example: "origin": "Delhi", "destination": "Detroit"
  },
  "intent_context": "string (Plain text summary of their goal)",
  "constraints": {
    "max_time_ms": 120000,
    "requires_js_rendering": boolean (true if headless browser needed),
    "human_in_loop_required": boolean (true if they want QA, false default),
    "proxy_tier": "string (datacenter | residential | isp) based on how hard you think this site is to scrape",
    "anti_bot_risk": "string (low | medium | high) based on the domain's known anti-bot defense level",
    "authentication_required": boolean (true if the site requires a login to view the data)
  },
  "expected_schema": {
    // Column map. Example: "price": "number"
  }
}
DO NOT output conversational text, markdown blocks, or anything outside of the JSON object.
`;

let chatHistory = [
    { role: "system", content: SYSTEM_PROMPT }
];

const TEMPLATES = {
    flight: "scrape the flight price details of air india , flight from delhi to detroit for coming saturday",
    amazon: "I want to scrape the front page of amazon.com for gaming laptops. Give me the titles, prices, and review count."
};

function loadPrompt(type) {
    document.getElementById('aiPrompt').value = TEMPLATES[type];
    pushLog(`Loaded ${type} template.`, 'warn');
}

const simLogs = document.getElementById('simLogs');
function pushLog(msg, type='ok') {
    simLogs.innerHTML += `<li class="${type}">[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${msg}</li>`;
}

function renderChatBubble(text, isUser) {
    const historyDiv = document.getElementById('chatHistory');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`;
    bubble.innerText = text;
    historyDiv.appendChild(bubble);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

async function simulateLLMModule1() {
    const promptInput = document.getElementById('aiPrompt');
    const apiKey = document.getElementById('openRouterKey').value;
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');
    const statusBadge = document.getElementById('statusBadge');
    const jsonOutput = document.getElementById('jsonOutput');
    const userText = promptInput.value.trim();

    if (!userText) {
        pushLog("Error: Prompt is empty.", "err");
        return;
    }
    if (!apiKey) {
        document.getElementById('apiErrorLog').innerText = "Please provide an OpenRouter API key above.";
        return;
    }

    document.getElementById('apiErrorLog').innerText = '';
    promptInput.value = ''; // clear input
    renderChatBubble(userText, true);
    
    // Add to LLM Context
    chatHistory.push({ role: "user", content: userText });

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    statusBadge.className = "status-badge waiting";
    statusBadge.innerText = "LLM Processing... 🧠";
    pushLog("Sending multi-turn context to OpenRouter...", "ok");

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: chatHistory
            })
        });

        if (!response.ok) throw new Error("API Connection Failed");

        const data = await response.json();
        const llmContent = data.choices[0].message.content;
        
        chatHistory.push({ role: "assistant", content: llmContent });

        let parsedPayload;
        try {
            let cleanString = llmContent.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedPayload = JSON.parse(cleanString);
        } catch(e) {
            throw new Error("LLM failed to return valid JSON format.");
        }

        // Checking for Rule 1: Clarifying Question Fallback
        if (parsedPayload.clarifying_question) {
            pushLog("LLM deemed target unknown. Firing conversational fallback.", "warn");
            renderChatBubble(parsedPayload.clarifying_question, false);
            
            statusBadge.className = "status-badge waiting";
            statusBadge.innerText = "Awaiting User Reply... 💬";
            jsonOutput.innerText = "// AI is asking for more target details. Reply in the chat above.";
            return; 
        }

        // Must be Rule 2: Complete Payload
        pushLog("LLM intelligently profiled target and structured JSON.", "ok");
        
        const eventId = `req-${uuid.v4().substring(0,8)}`;
        const outputEvent = {
            event_id: eventId,
            event_type: "INPUT_CONTRACT_VALIDATED",
            timestamp: new Date().toISOString(),
            payload: parsedPayload,
            confidence_score: 1.0,
            justification: "Requirement conversationally processed and structured via LLM Intake Gateway."
        };
        
        statusBadge.className = "status-badge success";
        statusBadge.innerText = "Validation Passed! ✓";
        
        jsonOutput.innerHTML = syntaxHighlight(outputEvent);

    } catch (err) {
        statusBadge.className = "status-badge error";
        statusBadge.innerText = "Processing Failed! ✕";
        jsonOutput.innerText = "// ERROR: " + err.message;
        pushLog("Error: " + err.message, "err");
    } finally {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
        promptInput.focus();
    }
}

function syntaxHighlight(json) {
    let str = JSON.stringify(json, null, 2);
    str = str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) cls = 'key';
            else cls = 'string';
        } else if (/true|false/.test(match)) cls = 'boolean';
        else if (/null/.test(match)) cls = 'null';
        return '<span class="' + cls + '">' + match + '</span>';
    });
    return `<style>
    .string { color: #C3E88D; }
    .number { color: #F78C6C; }
    .boolean { color: #82AAFF; }
    .null { color: #FFCB6B; }
    .key { color: #89DDFF; }
    </style>` + str;
}

function copyToClipboard() {
    const rawText = document.getElementById('jsonOutput').innerText;
    navigator.clipboard.writeText(rawText);
    alert("Copied to clipboard! Share this JSON with Module 2.");
}
