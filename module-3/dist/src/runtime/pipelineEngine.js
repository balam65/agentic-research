"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineEngine = void 0;
const node_crypto_1 = require("node:crypto");
const confidenceScorer_1 = require("../helpers/confidenceScorer");
const worldModelPort_1 = require("../ports/worldModelPort");
const contracts_1 = require("../types/contracts");
const capabilityRegistry_1 = require("./capabilityRegistry");
const context_1 = require("./context");
const defaultCapabilities_1 = require("./defaultCapabilities");
const eventBus_1 = require("./eventBus");
const hitlPolicyEngine_1 = require("./hitlPolicyEngine");
class PipelineEngine {
    worldModel;
    hitlPolicyEngine;
    capabilityRegistry;
    confidenceScorer = new confidenceScorer_1.ConfidenceScorer();
    constructor(options = {}) {
        this.worldModel = options.worldModel ?? new worldModelPort_1.InMemoryWorldModelPort();
        this.hitlPolicyEngine = options.hitlPolicyEngine ?? new hitlPolicyEngine_1.HitlPolicyEngine({ minConfidence: 0.8 });
        this.capabilityRegistry = options.capabilityRegistry ?? new capabilityRegistry_1.CapabilityRegistry();
        if (this.capabilityRegistry.list().length === 0) {
            for (const service of (0, defaultCapabilities_1.createDefaultCapabilityServices)()) {
                this.capabilityRegistry.register(service);
            }
        }
    }
    async run(inputOrRequest) {
        const input = (0, contracts_1.isModule2ExecutionRequest)(inputOrRequest)
            ? (0, contracts_1.mapModule2RequestToPipelineInput)(inputOrRequest)
            : inputOrRequest;
        (0, contracts_1.assertPipelineInput)(input);
        const jobId = (0, node_crypto_1.randomUUID)();
        const context = (0, context_1.createCapabilityContext)(input, {
            jobId,
            worldModel: this.worldModel
        });
        const eventBus = new eventBus_1.EventBus();
        const history = [];
        let terminalEvent;
        try {
            await this.worldModel.registerCapabilities(this.capabilityRegistry.list());
            await this.worldModel.initJob({
                id: jobId,
                title: `Research job for ${input.target_domain}`,
                status: "pending",
                input_params: input,
                priority: 0
            });
            await this.worldModel.updateJobStatus(jobId, "running");
            eventBus.publish({
                event_name: "input_received",
                job_id: jobId,
                payload: input,
                confidence_score: 1,
                justification: "Pipeline input received and accepted."
            });
            while (eventBus.hasPending() && !terminalEvent) {
                const event = eventBus.next();
                if (!event)
                    break;
                history.push(event);
                await context.worldModel.writeEvent(event);
                context.traceBuilder.addFromEvent(event);
                if (event.event_name === "extraction_completed") {
                    await context.worldModel.saveExtractedData({
                        job_id: event.job_id,
                        source_url: typeof event.payload.source_url === "string" ? event.payload.source_url : undefined,
                        content: event.payload.extracted_data ?? event.payload,
                        confidence: event.confidence_score ?? 1,
                        is_validated: false
                    });
                }
                if (event.event_name === "qa_validated") {
                    await context.worldModel.markLatestExtractedDataValidated(event.job_id);
                    const handoffConfidence = this.confidenceScorer.fromEvents(history);
                    eventBus.publish({
                        event_name: "delivery_handoff_ready",
                        job_id: event.job_id,
                        payload: {
                            validated_data: event.payload.validated_data,
                            traceability_log: context.traceBuilder.toArray(),
                            confidence_score: handoffConfidence,
                            handoff_to: "module-6-delivery"
                        },
                        confidence_score: handoffConfidence,
                        justification: "QA validated output is ready for Delivery module handoff."
                    });
                }
                if (event.event_name === "delivery_handoff_ready" || event.event_name === "hitl_required") {
                    terminalEvent = event;
                    continue;
                }
                const hitlEvent = this.hitlPolicyEngine.evaluate(event);
                if (hitlEvent) {
                    eventBus.publish(hitlEvent);
                    continue;
                }
                const consumers = this.capabilityRegistry.getConsumers(event.event_name);
                for (const capability of consumers) {
                    const nextEvents = await capability.execute(context, event);
                    for (const nextEvent of nextEvents) {
                        eventBus.publish(nextEvent);
                    }
                }
            }
        }
        catch (error) {
            await this.worldModel.updateJobStatus(jobId, "failed");
            throw error;
        }
        if (!terminalEvent) {
            terminalEvent = {
                event_name: "hitl_required",
                job_id: jobId,
                payload: {
                    trigger_event: "pipeline_stalled",
                    reason: "Pipeline did not reach a terminal state."
                },
                confidence_score: 0.4,
                justification: "Pipeline stalled before terminal handoff."
            };
            history.push(terminalEvent);
            await context.worldModel.writeEvent(terminalEvent);
            context.traceBuilder.addFromEvent(terminalEvent);
        }
        const nextAction = terminalEvent.event_name === "delivery_handoff_ready" ? "delivery_handoff_ready" : "hitl_required";
        const validatedData = nextAction === "delivery_handoff_ready"
            ? terminalEvent.payload.validated_data
            : context.sharedState.get("validated_data") ?? null;
        if (nextAction === "delivery_handoff_ready") {
            await this.worldModel.updateJobStatus(jobId, "completed");
            await this.worldModel.updateJobFinalOutput(jobId, `module-6://delivery_handoff/${jobId}`);
        }
        else {
            await this.worldModel.updateJobStatus(jobId, "hitl_alert");
        }
        return {
            validated_data: validatedData,
            traceability_log: context.traceBuilder.toArray(),
            confidence_score: typeof terminalEvent.confidence_score === "number"
                ? terminalEvent.confidence_score
                : this.confidenceScorer.fromEvents(history),
            next_action: nextAction
        };
    }
    getWorldModelPort() {
        return this.worldModel;
    }
    getCapabilityRegistry() {
        return this.capabilityRegistry;
    }
}
exports.PipelineEngine = PipelineEngine;
