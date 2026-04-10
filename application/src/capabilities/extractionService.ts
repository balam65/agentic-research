import type { CapabilityContext } from "../runtime/context";
import type { CapabilityService, PipelineEvent } from "../types/contracts";
import { isRecord } from "../types/contracts";

export class ExtractionService implements CapabilityService {
  name = "extraction";
  consumes = ["proxy_acquired"];
  produces = ["extraction_completed", "extraction_failed"];

  async execute(context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.target_url !== "string") {
      return [this.failedEvent(event, "Proxy payload missing target_url", 0.4)];
    }

    const targetUrl = event.payload.target_url;
    if (targetUrl.includes("fail")) {
      return [this.failedEvent(event, "Simulated extraction failure triggered by target URL", 0.45)];
    }

    const extractedData = this.buildSchemaDrivenPayload(
      context.input.extracted_schema_definition,
      targetUrl
    );

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

  private buildSchemaDrivenPayload(
    schema: Record<string, string | object>,
    targetUrl: string
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const [field, definition] of Object.entries(schema)) {
      if (typeof definition === "string") {
        payload[field] = this.valueForType(field, definition, targetUrl);
        continue;
      }

      if (definition && typeof definition === "object" && !Array.isArray(definition)) {
        payload[field] = this.buildSchemaDrivenPayload(
          definition as Record<string, string | object>,
          targetUrl
        );
        continue;
      }

      payload[field] = null;
    }

    return payload;
  }

  private valueForType(fieldName: string, typeName: string, targetUrl: string): unknown {
    switch (typeName) {
      case "string":
        if (fieldName.toLowerCase().includes("url")) return targetUrl;
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

  private failedEvent(event: PipelineEvent, message: string, confidence: number): PipelineEvent {
    return {
      event_name: "extraction_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: confidence,
      justification: message
    };
  }
}
