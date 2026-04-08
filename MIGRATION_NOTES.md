# Migration Notes

## Removed From Primary Runtime
- Fixed linear routing as the source of truth
- Pipeline-first framing of discovery, scripting, extraction, and delivery
- Top-level dependence on stage-specific intermediates

## Transformed
- The project now centers on:
  - `world_model/`
  - `capabilities/`
  - `intelligence/`
  - `context/`
  - `surface/`
  - `interfaces/`
  - `evaluation/`
- Execution order is selected at runtime from world-state and capability contracts.
- Capability discovery now happens through `context/capability-manifest.json`.

## Legacy Areas
- `application/` and `orchestration/` remain in the repository as legacy scaffolding and historical reference.
- The new root-level architecture is the primary implementation target.
