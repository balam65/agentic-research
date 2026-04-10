"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceScorer = void 0;
class ConfidenceScorer {
    normalize(score) {
        if (Number.isNaN(score))
            return 0;
        if (score < 0)
            return 0;
        if (score > 1)
            return 1;
        return Number(score.toFixed(4));
    }
    average(scores) {
        if (scores.length === 0)
            return 0;
        const total = scores.reduce((sum, score) => sum + this.normalize(score), 0);
        return this.normalize(total / scores.length);
    }
    fromEvents(events) {
        const scores = events
            .map((event) => event.confidence_score)
            .filter((score) => typeof score === "number");
        if (scores.length === 0)
            return 1;
        return this.average(scores);
    }
    applyPenalty(baseScore, penalty) {
        return this.normalize(baseScore - penalty);
    }
}
exports.ConfidenceScorer = ConfidenceScorer;
