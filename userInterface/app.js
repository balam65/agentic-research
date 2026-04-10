// Module 1 Frontend: Connects to New Local Backend Server

let chatHistory = [];

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
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');
    const statusBadge = document.getElementById('statusBadge');
    const jsonOutput = document.getElementById('jsonOutput');
    const userText = promptInput.value.trim();

    if (!userText) {
        pushLog("Error: Prompt is empty.", "err");
        return;
    }

    document.getElementById('apiErrorLog').innerText = '';
    promptInput.value = ''; // clear input
    renderChatBubble(userText, true);
    
    // Add to local context
    chatHistory.push({ role: "user", content: userText });

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    statusBadge.className = "status-badge waiting";
    statusBadge.innerText = "Backend Processing... 🧠";
    pushLog("Dispatching to http://127.0.0.1:8000/api/v1/intake", "ok");

    try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/intake", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: chatHistory })
        });

        if (!response.ok) {
            let errorMsg = `Server returned ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.error || errorMsg;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const parsedPayload = await response.json();
        
        // If the backend returns a Clarifying Question payload
        if (parsedPayload.clarifying_question) {
            pushLog("Backend deemed target unknown. Asking in UI.", "warn");
            chatHistory.push({ role: "assistant", content: parsedPayload.clarifying_question });
            renderChatBubble(parsedPayload.clarifying_question, false);
            
            statusBadge.className = "status-badge waiting";
            statusBadge.innerText = "Awaiting User Reply... 💬";
            jsonOutput.innerText = "// AI is asking for more target details. Reply in the chat above.";
            return; 
        }

        // Full Handoff Payload received!
        pushLog("Backend successfully created Validated Event.", "ok");
        
        statusBadge.className = "status-badge success";
        statusBadge.innerText = "Validation Passed! ✓";
        
        jsonOutput.innerHTML = syntaxHighlight(parsedPayload);

    } catch (err) {
        statusBadge.className = "status-badge error";
        statusBadge.innerText = "Server Error ✕";
        jsonOutput.innerText = "// ERROR: " + err.message + "\n\nMake sure application/server.ts is running!";
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
