export interface AgentDecision {
  selected_capability_id: string | null;
  reasoning_summary: string;
  requires_human_review: boolean;
  stop_execution: boolean;
  confidence: number;
  missing_information: string[];
  requested_next_event?: string;
}

export function parseAgentDecision(raw: string): AgentDecision {
  const parsed = JSON.parse(raw) as Partial<AgentDecision>;

  return {
    selected_capability_id:
      typeof parsed.selected_capability_id === 'string' || parsed.selected_capability_id === null
        ? parsed.selected_capability_id
        : null,
    reasoning_summary:
      typeof parsed.reasoning_summary === 'string'
        ? parsed.reasoning_summary
        : 'No reasoning summary was provided.',
    requires_human_review: parsed.requires_human_review === true,
    stop_execution: parsed.stop_execution === true,
    confidence:
      typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0,
    missing_information: Array.isArray(parsed.missing_information)
      ? parsed.missing_information.filter((item): item is string => typeof item === 'string')
      : [],
  };
}
