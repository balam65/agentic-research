import { WorldModelEvent } from '../world_model/store';
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
export declare class AgenticOrchestrator {
    private registry;
    private store;
    private operatingFrame;
    constructor();
    private registerCapability;
    /**
     * Reconstructs the 'Clear State' for a specific entity by analyzing past World Model Events.
     */
    private buildEntityState;
    /**
     * Agentic Decision Logic Flow
     */
    decideAndExecute(incomingEvent: WorldModelEvent): Promise<void>;
}
//# sourceMappingURL=agentic_router.d.ts.map