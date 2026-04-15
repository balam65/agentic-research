import dotenv from 'dotenv';
import path from 'path';
import { CapabilityRegistry } from '../capabilities/registry';
import { AgenticOrchestrator } from '../intelligence/orchestrator';
import { WorldModelStore } from '../world_model/event_store';
import { ValidatedInputEvent } from '../world_model/schema';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function repro() {
  console.log('🚀 Starting Decision Reproduction for req-299f09e9...');

  const store = new WorldModelStore(); // In-memory store for test
  const registry = new CapabilityRegistry(new URL('../context/capability-manifest.json', import.meta.url));
  const orchestrator = new AgenticOrchestrator(store, registry);
  await orchestrator.boot();

  const event: ValidatedInputEvent = {
    "event_id": "req-299f09e9",
    "event_type": "INPUT_CONTRACT_VALIDATED",
    "timestamp": new Date().toISOString(),
    "payload": {
      "target": {
        "url_or_domain": "airindia.com",
        "scope": "search_results"
      },
      "search_parameters": {
        "origin": "Delhi",
        "destination": "Detroit",
        "date": "coming saturday"
      },
      "intent_context": "The user wants to scrape flight search results from Air India for a trip originating in Delhi and destination Detroit, departing on the upcoming Saturday.",
      "constraints": {
        "requires_js_rendering": true,
        "human_in_loop_required": false,
        "proxy_tier": "datacenter",
        "anti_bot_risk": "medium",
        "authentication_required": false,
        "max_time_ms": 120000
      },
      "expected_schema": {
        "Flight Number": "string",
        "Airline": "string",
        "Departure Time": "datetime",
        "Arrival Time": "datetime",
        "Duration": "duration",
        "Price": "number"
      }
    },
    "confidence_score": 1,
    "justification": "Requirement conversationally processed and structured via LLM Server."
  };

  try {
    console.log('--- Calling Orchestrator ---');
    const decision = await orchestrator.handleEvent(event);
    console.log('--- Decision Received ---');
    console.log(JSON.stringify(decision, null, 2));

    if (decision.next_event === 'MODEL_UNAVAILABLE') {
      console.error('❌ Still failing with MODEL_UNAVAILABLE');
    } else {
      console.log('✅ Success! Orchestrator made a decision.');
      console.log(`   Target Module: ${decision.target_module}`);
      console.log(`   Next Event: ${decision.next_event}`);
    }
  } catch (err) {
    console.error('❌ Fatal Error during reproduction:', err);
  }
}

repro();
