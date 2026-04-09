"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleManagerCapability = void 0;
const store_1 = require("../../world_model/store");
function pseudoUUID() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
class ScheduleManagerCapability {
    store;
    constructor() {
        this.store = new store_1.WorldModelStore();
    }
    async queueTarget(assessmentEvent) {
        const runId = assessmentEvent.source_agent_run_id || pseudoUUID();
        const targetPayload = assessmentEvent.payload;
        console.log(`[CapSched] Enqueueing target: ${targetPayload.normalized_target}`);
        await this.store.publishEvent({
            event_name: 'job_scheduled',
            source_agent_run_id: runId,
            entity_id: assessmentEvent.entity_id,
            payload: {
                job_batch_id: `batch-${Date.now()}`,
                target_domain: targetPayload.normalized_target,
                priority_level: 1,
                schema: targetPayload.extracted_schema_definition
            },
            confidence_score: 1.0,
            justification: "Job prioritized and strictly scheduled for processing queue."
        });
    }
}
exports.ScheduleManagerCapability = ScheduleManagerCapability;
//# sourceMappingURL=index.js.map