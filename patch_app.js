--- ui-portal/app.js
+++ ui-portal/app.js
@@ -129,4 +129,35 @@
     alert("Copied to clipboard! Share this JSON with Module 2.");
 }
 
+async function sendToModule2() {
+    const rawText = document.getElementById('jsonOutput').innerText;
+    let payload;
+    try {
+        payload = JSON.parse(rawText);
+    } catch(e) {
+        alert("Invalid JSON or no payload to send.");
+        return;
+    }
+    
+    // Map the Module 1 Payload to N8N Master Workflow expected format
+    const n8nPayload = {
+        trigger_event: "initial_request",
+        brief: payload.module_1_event?.payload?.intent_context || payload.intent_context,
+        domain_name: payload.module_1_event?.payload?.target?.url_or_domain || payload.target?.url_or_domain,
+        raw_event: payload
+    };
+
+    pushLog("Dispatching to N8N Webhook (Module 2)...", "warn");
+    try {
+        const response = await fetch("http://localhost:5678/webhook/research-request", {
+            method: "POST",
+            headers: { "Content-Type": "application/json" },
+            body: JSON.stringify(n8nPayload)
+        });
+        if (!response.ok) throw new Error(`N8N Webhook returned ${response.status}`);
+        alert("Successfully sent to Module 2 (N8N Webhook)!");
+        pushLog("Module 2 triggered successfully.", "ok");
+    } catch (error) {
+        alert("Failed to send to Module 2. Ensure N8N is running on port 5678.\nError: " + error.message);
+        pushLog("Error sending to Module 2: " + error.message, "err");
+    }
+}
