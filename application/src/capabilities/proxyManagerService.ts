import type { CapabilityContext } from "../runtime/context";
import type { CapabilityService, PipelineEvent } from "../types/contracts";
import { isRecord } from "../types/contracts";

export class ProxyManagerService implements CapabilityService {
  name = "proxy_manager";
  consumes = ["script_ready"];
  produces = ["proxy_acquired", "proxy_failed"];

  async execute(_context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.target_url !== "string") {
      return [this.failedEvent(event, "Script payload missing target_url")];
    }

    const proxyId = `proxy-node-${Math.floor(Math.random() * 20) + 1}`;
    return [
      {
        event_name: "proxy_acquired",
        job_id: event.job_id,
        payload: {
          target_url: event.payload.target_url,
          script_id: event.payload.script_id,
          proxy_id: proxyId,
          anti_bot_evasion_enabled: true
        },
        confidence_score: 0.9,
        justification: "Proxy manager assigned rotating proxy session for extraction."
      }
    ];
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    return {
      event_name: "proxy_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.4,
      justification: message
    };
  }
}
