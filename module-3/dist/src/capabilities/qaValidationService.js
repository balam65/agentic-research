"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaValidationService = void 0;
const schemaValidator_1 = require("../helpers/schemaValidator");
const contracts_1 = require("../types/contracts");
class QaValidationService {
    name = "qa_validation";
    consumes = ["extraction_completed"];
    produces = ["qa_validated", "qa_failed"];
    async execute(context, event) {
        if (!(0, contracts_1.isRecord)(event.payload) || !(0, contracts_1.isRecord)(event.payload.extracted_data)) {
            return [this.failedEvent(event, "Extraction payload missing extracted_data object")];
        }
        const validation = schemaValidator_1.SchemaValidator.validate(context.input.extracted_schema_definition, event.payload.extracted_data);
        if (!validation.valid) {
            return [
                {
                    event_name: "qa_failed",
                    job_id: event.job_id,
                    payload: {
                        errors: validation.errors
                    },
                    confidence_score: 0.55,
                    justification: "QA validation failed against extracted schema definition."
                }
            ];
        }
        const validatedData = event.payload.extracted_data;
        context.sharedState.set("validated_data", validatedData);
        return [
            {
                event_name: "qa_validated",
                job_id: event.job_id,
                payload: {
                    validated_data: validatedData
                },
                confidence_score: Math.min(event.confidence_score ?? 1, 0.97),
                justification: "QA validation passed schema checks and quality gate."
            }
        ];
    }
    failedEvent(event, message) {
        return {
            event_name: "qa_failed",
            job_id: event.job_id,
            payload: { error: message },
            confidence_score: 0.55,
            justification: message
        };
    }
}
exports.QaValidationService = QaValidationService;
