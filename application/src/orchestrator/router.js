"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorRouter = void 0;
const store_1 = require("../world_model/store");
const assessment_1 = require("../capabilities/assessment");
const schedule_manager_1 = require("../capabilities/schedule_manager");
const url_discovery_1 = require("../capabilities/url_discovery");
const scripting_1 = require("../capabilities/scripting");
const proxy_manager_1 = require("../capabilities/proxy_manager");
const data_extractor_1 = require("../capabilities/data_extractor");
const qa_validation_1 = require("../capabilities/qa_validation");
const delivery_1 = require("../capabilities/delivery");
class OrchestratorRouter {
    capAssess = new assessment_1.AssessmentCapability();
    capSched = new schedule_manager_1.ScheduleManagerCapability();
    capDisc = new url_discovery_1.UrlDiscoveryCapability();
    capScript = new scripting_1.ScriptingCapability();
    capProxy = new proxy_manager_1.ProxyManagerCapability();
    capExtr = new data_extractor_1.DataExtractorCapability();
    capQA = new qa_validation_1.QAValidationCapability();
    capDeliv = new delivery_1.DeliveryCapability();
    async handleEvent(event) {
        console.log(`[Orchestrator] Received event: ${event.event_name} (Conf: ${event.confidence_score})`);
        // HITL policy intercept
        if (this.requiresHumanIntervention(event)) {
            console.warn(`[Orchestrator] HITL Triggered for ${event.event_name}`);
            return;
        }
        // Dynamic Pub/Sub Routing mapping directly to the capabilities defined in MMD
        switch (event.event_name) {
            case 'input_received':
                await this.capAssess.parseIntent(event);
                break;
            case 'assessment_completed':
                await this.capSched.queueTarget(event);
                break;
            case 'job_scheduled':
                await this.capDisc.execute(event);
                break;
            case 'url_discovered':
                await this.capScript.generateExtratorScript(event);
                break;
            case 'script_ready':
                await this.capProxy.acquireProxySession(event);
                break;
            case 'proxy_acquired':
                await this.capExtr.processWithPlaywright(event);
                break;
            case 'extraction_completed':
                this.capProxy.releaseSession(); // Cleanup session concurrently limit
                await this.capQA.validatePayload(event);
                break;
            case 'extraction_failed':
                this.capProxy.releaseSession();
                console.error(`Re-routing extraction failure to evasion retry logic or HITL.`);
                break;
            case 'qa_validated':
                await this.capDeliv.deliverPayload(event);
                break;
            case 'data_delivered':
                console.log(`[Orchestrator] Pipeline completed successfully for ${event.source_agent_run_id}. Data is shipped.`);
                break;
            default:
                console.log(`No routing defined for event: ${event.event_name}`);
        }
    }
    requiresHumanIntervention(event) {
        if (event.confidence_score !== undefined && event.confidence_score < 0.80) {
            return true;
        }
        return false;
    }
}
exports.OrchestratorRouter = OrchestratorRouter;
//# sourceMappingURL=router.js.map