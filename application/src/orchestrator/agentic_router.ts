import { WorldModelEvent, WorldModelStore } from '../world_model/store';
import { AssessmentCapability } from '../capabilities/assessment';
import { ScheduleManagerCapability } from '../capabilities/schedule_manager';
import { UrlDiscoveryCapability } from '../capabilities/url_discovery';
import { ScriptingCapability } from '../capabilities/scripting';
import { ProxyManagerCapability } from '../capabilities/proxy_manager';
import { DataExtractorCapability } from '../capabilities/data_extractor';
import { QAValidationCapability } from '../capabilities/qa_validation';
import { DeliveryCapability } from '../capabilities/delivery';

export interface CapabilityRegistryEntry {
    name: string;
    description: string;
    pre_conditions: string[];
    creates_state: string[];
    instance: any;
}

export interface OperatingFrame {
    constraints: string[];
    decision_policy: string;
}

/**
 * Agentic Orchestrator (The "Master Agent")
 * Architecture: Clear State + Capabilities + Constraints + Decision Policy
 */
export class AgenticOrchestrator {
    private registry: Record<string, CapabilityRegistryEntry> = {};
    private store: WorldModelStore;

    // The well-defined operating frame setting boundaries for the LLM
    private operatingFrame: OperatingFrame = {
        constraints: [
            "NEVER route to DataExtractor without a positive 'script_available' and 'proxy_acquired' state.",
            "If a script is requested but unavailable, route to Discovery and Scripting.",
            "If QA Validation fails (score < 0.8), DO NOT run Delivery.",
            "All pipelines must begin with Assessment."
        ],
        decision_policy: `
            Analyze the CURRENT STATE computed from the event history.
            Review the PRE_CONDITIONS of available capabilities.
            Select the capability whose pre_conditions are satisfied by the CURRENT STATE,
            and whose output moves the system closer to the final goal (Delivery).
            Adhere strictly to the CONSTRAINTS.
        `
    };

    constructor() {
        this.store = new WorldModelStore();

        // Registering Capabilities with explicit pre-conditions and state outputs
        this.registerCapability(
            'Assessment', 
            new AssessmentCapability(), 
            'Takes raw user input and outputs an actionable target schema and intent.',
            ['raw_input_received'],
            ['assessment_completed', 'has_target']
        );
        
        this.registerCapability(
            'ScheduleManager', 
            new ScheduleManagerCapability(), 
            'Queues the target and validates SLAs.',
            ['has_target'],
            ['target_queued']
        );

        this.registerCapability(
            'ScriptSelector', 
            { execute: async () => console.log('Checking script') }, 
            'Checks if a pre-existing script is available for the target.',
            ['target_queued'],
            ['script_checked'] // Produces either 'script_available' or 'script_missing'
        );

        this.registerCapability(
            'UrlDiscovery', 
            new UrlDiscoveryCapability(), 
            'Discovers and maps sub-URLs when no script is available.',
            ['script_missing'],
            ['urls_discovered']
        );

        this.registerCapability(
            'Scripting', 
            new ScriptingCapability(), 
            'Generates or loads DOM extraction scripts based on discovered URLs.',
            ['urls_discovered'],
            ['script_available']
        );

        this.registerCapability(
            'ProductionScale', 
            new ProxyManagerCapability(), 
            'Automates proxy assignment and scale logic. Required for Extraction.',
            ['script_available'],
            ['proxy_acquired']
        );

        this.registerCapability(
            'DataExtractor', 
            new DataExtractorCapability(), 
            'Executes the browser extraction workflow.',
            ['script_available', 'proxy_acquired'],
            ['extraction_completed', 'raw_payload']
        );

        this.registerCapability(
            'QAValidation', 
            new QAValidationCapability(), 
            'Validates raw payloads against the requested schema and logic.',
            ['raw_payload'],
            ['qa_validated']
        );

        this.registerCapability(
            'Delivery', 
            new DeliveryCapability(), 
            'Securely delivers the final dataset to the client.',
            ['qa_validated'],
            ['delivery_completed']
        );
    }

    private registerCapability(name: string, instance: any, description: string, reqs: string[], outputs: string[]) {
        this.registry[name] = { name, instance, description, pre_conditions: reqs, creates_state: outputs };
    }

    /**
     * Reconstructs the 'Clear State' for a specific entity by analyzing past World Model Events.
     */
    private async buildEntityState(entityId: string): Promise<Set<string>> {
        const events = await this.store.getRecentEvents(undefined, 50);
        const entityEvents = events.filter((e: any) => e.entity_id === entityId);
        
        const currentState = new Set<string>();
        // Rebuild state flags chronologically based on event payloads
        entityEvents.forEach((ev: any) => {
            if (ev.payload?.emitted_state) {
                ev.payload.emitted_state.forEach((stateFlag: string) => currentState.add(stateFlag));
            }
            if (ev.event_name === 'input_received') currentState.add('raw_input_received');
        });

        // Fallback for simulation
        if (currentState.size === 0) currentState.add('raw_input_received');

        return currentState;
    }

    /**
     * Agentic Decision Logic Flow
     */
    async decideAndExecute(incomingEvent: WorldModelEvent) {
        console.log(`[MasterAgent] Orchestration Triggered by Event: '${incomingEvent.event_name}'`);
        
        // 1. Build Clear State
        const currentStateFlags = await this.buildEntityState(incomingEvent.entity_id || 'unknown');
        
        // 2. Filter Available Capabilities
        // Only consider capabilities whose pre_conditions are a subset of the current state
        const validCapabilities = Object.values(this.registry).filter(cap => 
            cap.pre_conditions.every(cond => currentStateFlags.has(cond))
        );

        // 3. Construct LLM Router Prompt (Simulating the AI Cognitive Step)
        const systemPrompt = `
You are the Master Orchestration Agent. Your job is to select the next appropriate capability.

=== CURRENT STATE ===
Entity ID: ${incomingEvent.entity_id}
Active State Flags: [${Array.from(currentStateFlags).join(', ')}]
Latest Event: ${incomingEvent.event_name}

=== CAPABILITY REGISTRY ===
${validCapabilities.map(c => `- ${c.name}: ${c.description} (Produces: ${c.creates_state.join(', ')})`).join('\n')}

=== OPERATING FRAME ===
Constraints:
${this.operatingFrame.constraints.map(c => `- ${c}`).join('\n')}

Decision Policy:
${this.operatingFrame.decision_policy}

OUTPUT ONLY THE EXACT NAME OF THE CAPABILITY TO EXECUTE.
`;

        console.log(`[MasterAgent: Decision Context Builder] Validating constraints and evaluating ${validCapabilities.length} possible valid capabilities...`);

        // =========================================================================
        // SIMULATED LLM INFERENCE
        // In reality, you await OpenAi/Anthropic here with the prompt above.
        // We simulate the LLM following the constraints below:
        // =========================================================================
        let selectedCapabilityName: string | null = null;
        
        if (currentStateFlags.has('qa_validated')) selectedCapabilityName = 'Delivery';
        else if (currentStateFlags.has('raw_payload')) selectedCapabilityName = 'QAValidation';
        else if (currentStateFlags.has('script_available') && currentStateFlags.has('proxy_acquired')) selectedCapabilityName = 'DataExtractor';
        else if (currentStateFlags.has('script_available') && !currentStateFlags.has('proxy_acquired')) selectedCapabilityName = 'ProductionScale';
        else if (currentStateFlags.has('urls_discovered')) selectedCapabilityName = 'Scripting';
        else if (currentStateFlags.has('script_missing')) selectedCapabilityName = 'UrlDiscovery';
        else if (currentStateFlags.has('target_queued')) selectedCapabilityName = 'ScriptSelector';
        else if (currentStateFlags.has('has_target')) selectedCapabilityName = 'ScheduleManager';
        else if (currentStateFlags.has('raw_input_received')) selectedCapabilityName = 'Assessment';

        // 4. Execution Guard & Execution
        if (!selectedCapabilityName || !this.registry[selectedCapabilityName]) {
            console.warn(`[MasterAgent: ALERT] No valid capability found within operating frame constraints. Halting for HITL.`);
            return;
        }

        const capabilityToRun = this.registry[selectedCapabilityName];
        console.log(`[MasterAgent: LLM Policy Decision] Selected: '${capabilityToRun.name}'`);

        // Standardized Contract Invocation
        if (typeof capabilityToRun.instance.execute === 'function') {
            await capabilityToRun.instance.execute(incomingEvent);
        } else if (typeof capabilityToRun.instance.parseIntent === 'function') {
            await capabilityToRun.instance.parseIntent(incomingEvent);
        } else {
            console.log(`[MasterAgent] Executing ${capabilityToRun.name}...`);
        }
    }
}
