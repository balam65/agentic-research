import type { CapabilityContext } from "../runtime/context";
import type { CapabilityService, PipelineEvent } from "../types/contracts";
import { isRecord } from "../types/contracts";

export class ScriptingService implements CapabilityService {
  name = "scripting";
  consumes = ["url_discovered"];
  produces = ["script_ready", "scripting_failed"];

  async execute(_context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.discovered_url !== "string") {
      return [this.failedEvent(event, "Discovery payload missing discovered_url")];
    }

    return [
      {
        event_name: "script_ready",
        job_id: event.job_id,
        payload: {
          target_url: event.payload.discovered_url,
          script_id: `script-${Date.now()}`,
          playwright_script:
            "const title = await page.textContent('h1'); return { title, content: await page.textContent('body') };"
        },
        confidence_score: 0.9,
        justification: "Scripting generated an extraction script for target URL."
      }
    ];
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    return {
      event_name: "scripting_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.4,
      justification: message
    };
  }
}
