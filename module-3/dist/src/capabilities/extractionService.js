"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionService = void 0;
const contracts_1 = require("../types/contracts");
class ExtractionService {
    name = "extraction";
    consumes = ["proxy_acquired"];
    produces = ["extraction_completed", "extraction_failed"];
    async execute(context, event) {
        if (!(0, contracts_1.isRecord)(event.payload) || typeof event.payload.target_url !== "string") {
            return [this.failedEvent(event, "Proxy payload missing target_url", 0.4)];
        }
        const targetUrl = event.payload.target_url;
        if (targetUrl.includes("fail")) {
            return [this.failedEvent(event, "Simulated extraction failure triggered by target URL", 0.45)];
        }
        const extractedData = this.buildSchemaDrivenPayload(context.input.extracted_schema_definition, targetUrl);
        const isFallbackRun = targetUrl.includes("fallback");
        const confidence = isFallbackRun
            ? context.confidenceScorer.applyPenalty(0.9, 0.18)
            : 0.91;
        return [
            {
                event_name: "extraction_completed",
                job_id: event.job_id,
                payload: {
                    extracted_data: extractedData,
                    source_url: targetUrl,
                    extractor_type: "playwright_mock"
                },
                confidence_score: confidence,
                justification: isFallbackRun
                    ? "Extraction succeeded via fallback strategy with reduced confidence."
                    : "Extraction succeeded using primary strategy."
            }
        ];
    }
    buildSchemaDrivenPayload(schema, targetUrl) {
        const payload = {};
        for (const [field, definition] of Object.entries(schema)) {
            if (typeof definition === "string") {
                payload[field] = this.valueForType(field, definition, targetUrl);
                continue;
            }
            if (definition && typeof definition === "object" && !Array.isArray(definition)) {
                payload[field] = this.buildSchemaDrivenPayload(definition, targetUrl);
                continue;
            }
            payload[field] = null;
        }
        return payload;
    }
    valueForType(fieldName, typeName, targetUrl) {
        switch (typeName) {
            case "string":
                if (fieldName.toLowerCase().includes("url"))
                    return targetUrl;
                return `mock_${fieldName}`;
            case "number":
                return 100;
            case "boolean":
                return true;
            case "array":
                return [];
            case "object":
                return {};
            default:
                return null;
        }
    }
    failedEvent(event, message, confidence) {
        return {
            event_name: "extraction_failed",
            job_id: event.job_id,
            payload: { error: message },
            confidence_score: confidence,
            justification: message
        };
    }
}
exports.ExtractionService = ExtractionService;
