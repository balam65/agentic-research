# System Contract

## Non-Negotiable Input
- A request identifier
- A target specification
- A requested output schema
- Hard constraints that govern budget, volume, delivery mode, and human review

## Non-Negotiable Output
- A validated result for the request
- A delivery receipt when external delivery is requested
- A human review packet only when governance requires explicit intervention

## Contract Rule
The platform does not promote intermediate artifacts to top-level commitments unless they have intrinsic governance or human-inspection value.

## Capability Discovery Rule
The intelligence layer discovers capabilities from `context/capability-manifest.json` and never encodes a fixed execution sequence.
