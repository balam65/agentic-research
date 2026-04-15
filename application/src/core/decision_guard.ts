import type { CapabilityModule } from './capability_types.js';
import type { AgentDecision } from './decision_schema.js';

export class DecisionGuard {
  validate(
    decision: AgentDecision,
    capabilities: CapabilityModule[],
    candidateCapabilityIds?: string[],
  ): { valid: boolean; reason: string; usePlannerFallback?: boolean } {
    if (decision.stop_execution) {
      return { valid: true, reason: 'Decision requested graceful stop.' };
    }

    if (decision.requires_human_review) {
      return { valid: true, reason: 'Decision requested human review.' };
    }

    if (!decision.selected_capability_id) {
      // Instead of hard-failing, signal the orchestrator to use the planner fallback
      return {
        valid: true,
        reason: 'Model did not select a capability. Planner fallback recommended.',
        usePlannerFallback: true,
      };
    }

    const exists = capabilities.some((capability) => capability.descriptor.id === decision.selected_capability_id);
    if (!exists) {
      // Unknown capability — also fall back to the planner
      return {
        valid: true,
        reason: `Unknown capability '${decision.selected_capability_id}'. Planner fallback recommended.`,
        usePlannerFallback: true,
      };
    }

    if (candidateCapabilityIds && candidateCapabilityIds.length === 0) {
      return {
        valid: false,
        reason: 'No allowed capabilities are available for model selection.',
      };
    }

    return { valid: true, reason: 'Decision selected a known capability.' };
  }
}
