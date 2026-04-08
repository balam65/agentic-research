import { CapabilityModule } from '../capabilities/types.js';
import { AgentDecision } from './decision_schema.js';

export class DecisionGuard {
  validate(decision: AgentDecision, capabilities: CapabilityModule[]): { valid: boolean; reason: string } {
    if (decision.stop_execution) {
      return { valid: true, reason: 'Decision requested graceful stop.' };
    }

    if (decision.requires_human_review) {
      return { valid: true, reason: 'Decision requested human review.' };
    }

    if (!decision.selected_capability_id) {
      return { valid: false, reason: 'Decision did not select a capability.' };
    }

    const exists = capabilities.some((capability) => capability.descriptor.id === decision.selected_capability_id);
    if (!exists) {
      return { valid: false, reason: `Unknown capability '${decision.selected_capability_id}'.` };
    }

    return { valid: true, reason: 'Decision selected a known capability.' };
  }
}
