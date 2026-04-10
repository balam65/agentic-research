import type { PipelineEvent } from "../types/contracts";

export class ConfidenceScorer {
  normalize(score: number): number {
    if (Number.isNaN(score)) return 0;
    if (score < 0) return 0;
    if (score > 1) return 1;
    return Number(score.toFixed(4));
  }

  average(scores: number[]): number {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, score) => sum + this.normalize(score), 0);
    return this.normalize(total / scores.length);
  }

  fromEvents(events: PipelineEvent[]): number {
    const scores = events
      .map((event) => event.confidence_score)
      .filter((score): score is number => typeof score === "number");
    if (scores.length === 0) return 1;
    return this.average(scores);
  }

  applyPenalty(baseScore: number, penalty: number): number {
    return this.normalize(baseScore - penalty);
  }
}
