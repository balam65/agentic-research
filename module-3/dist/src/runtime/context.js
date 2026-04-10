"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCapabilityContext = createCapabilityContext;
const node_crypto_1 = require("node:crypto");
const confidenceScorer_1 = require("../helpers/confidenceScorer");
const traceBuilder_1 = require("../helpers/traceBuilder");
const worldModelPort_1 = require("../ports/worldModelPort");
function createCapabilityContext(input, options = {}) {
    return {
        jobId: options.jobId ?? (0, node_crypto_1.randomUUID)(),
        input,
        worldModel: options.worldModel ?? new worldModelPort_1.InMemoryWorldModelPort(),
        traceBuilder: new traceBuilder_1.TraceBuilder(),
        confidenceScorer: new confidenceScorer_1.ConfidenceScorer(),
        sharedState: new Map()
    };
}
