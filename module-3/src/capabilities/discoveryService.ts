import type { CapabilityContext } from "../runtime/context";
import type { CapabilityService, PipelineEvent } from "../types/contracts";
import { isRecord } from "../types/contracts";

export class DiscoveryService implements CapabilityService {
  name = "discovery";
  consumes = ["job_scheduled"];
  produces = ["url_discovered", "discovery_failed"];

  async execute(_context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.target_domain !== "string") {
      return [this.failedEvent(event, "Scheduling payload missing target_domain")];
    }

    const targetDomain = event.payload.target_domain.trim().toLowerCase();
    if (!targetDomain) {
      return [this.failedEvent(event, "target_domain cannot be empty")];
    }

    return [
      {
        event_name: "url_discovered",
        job_id: event.job_id,
        payload: {
          target_domain: targetDomain,
          discovered_url: `https://${targetDomain}/research`,
          domain_authority: 85
        },
        confidence_score: 0.92,
        justification: "Discovery mapped domain to target extraction URL."
      }
    ];
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    return {
      event_name: "discovery_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.4,
      justification: message
    };
  }
}
