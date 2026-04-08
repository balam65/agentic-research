import { WorldModelEvent } from '../world_model/store';
import { AssessmentCapability } from '../capabilities/assessment';
import { ScheduleManagerCapability } from '../capabilities/schedule_manager';
import { UrlDiscoveryCapability } from '../capabilities/url_discovery';
import { ScriptingCapability } from '../capabilities/scripting';
import { ProxyManagerCapability } from '../capabilities/proxy_manager';
import { DataExtractorCapability } from '../capabilities/data_extractor';
import { QAValidationCapability } from '../capabilities/qa_validation';
import { DeliveryCapability } from '../capabilities/delivery';

export class OrchestratorRouter {
  private capAssess = new AssessmentCapability();
  private capSched = new ScheduleManagerCapability();
  private capDisc = new UrlDiscoveryCapability();
  private capScript = new ScriptingCapability();
  private capProxy = new ProxyManagerCapability();
  private capExtr = new DataExtractorCapability();
  private capQA = new QAValidationCapability();
  private capDeliv = new DeliveryCapability();

  async handleEvent(event: WorldModelEvent) {
    console.log(`[Orchestrator] Received event: ${event.event_name} (Conf: ${event.confidence_score})`);

    // HITL policy intercept
    if (this.requiresHumanIntervention(event)) {
      console.warn(`[Orchestrator] HITL Triggered for ${event.event_name}`);
      return; 
    }

    // Dynamic Pub/Sub Routing mapping directly to the capabilities defined in MMD
    switch (event.event_name) {
      case 'input_received':
        await this.capAssess.parseIntent(event); break;
      case 'assessment_completed':
        await this.capSched.queueTarget(event); break;
      case 'job_scheduled':
        await this.capDisc.execute(event); break;
      case 'url_discovered':
        await this.capScript.generateExtratorScript(event); break;
      case 'script_ready':
        await this.capProxy.acquireProxySession(event); break;
      case 'proxy_acquired':
        await this.capExtr.processWithPlaywright(event); break;
      case 'extraction_completed':
        this.capProxy.releaseSession(); // Cleanup session concurrently limit
        await this.capQA.validatePayload(event); break;
      case 'extraction_failed':
        this.capProxy.releaseSession();
        console.error(`Re-routing extraction failure to evasion retry logic or HITL.`); break;
      case 'qa_validated':
        await this.capDeliv.deliverPayload(event); break;
      case 'data_delivered':
        console.log(`[Orchestrator] Pipeline completed successfully for ${event.source_agent_run_id}. Data is shipped.`); break;
      default:
        console.log(`No routing defined for event: ${event.event_name}`);
    }
  }

  private requiresHumanIntervention(event: WorldModelEvent): boolean {
    if (event.confidence_score !== undefined && event.confidence_score < 0.80) {
      return true;
    }
    return false;
  }
}
