# Success Criteria

- Capabilities are loaded from manifest files rather than a hardcoded orchestrator sequence.
- The intelligence layer chooses the next capability from world-state, capability descriptors, and output goals at runtime.
- Every execution side effect is recorded in the world model as an event, artifact, metric, or error.
- Intelligence-layer decisions are recorded in the world model and visible to surface consumers.
- Human review is represented as governance state, not a baked-in stage.
- Adding a new capability requires a new module plus a manifest entry, not orchestration rewiring.
