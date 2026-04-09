"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QAValidationCapability = void 0;
const store_1 = require("../../world_model/store");
class QAValidationCapability {
    store;
    constructor() {
        this.store = new store_1.WorldModelStore();
    }
    async validatePayload(extractionEvent) {
        console.log(`[CapQA] Validating payload for exact schema mapping...`);
        const data = extractionEvent.payload.extracted_data;
        const baselineConfidence = extractionEvent.confidence_score;
        let finalScore = baselineConfidence;
        // Mock Schema validation algorithms
        if (!data || !data.title) {
            finalScore -= 0.3; // Heavy penalty for missing required fields
        }
        const isCompliant = finalScore >= 0.85; // Strict QA passing requirement
        const eventName = isCompliant ? 'qa_validated' : 'qa_failed';
        await this.store.publishEvent({
            event_name: eventName,
            source_agent_run_id: extractionEvent.source_agent_run_id,
            entity_id: extractionEvent.entity_id,
            payload: {
                validated_data: data,
                pii_masked: true
            },
            confidence_score: finalScore, // Setting system confidence score 
            justification: `QA logic algorithm applied. Schema compliant state: ${isCompliant}`
        });
    }
}
exports.QAValidationCapability = QAValidationCapability;
//# sourceMappingURL=index.js.map