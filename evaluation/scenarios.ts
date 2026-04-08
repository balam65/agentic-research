export const evaluationScenarios = [
  {
    name: 'happy_path_delivery',
    validates: ['dynamic capability selection', 'validated output generation', 'delivery receipt generation'],
  },
  {
    name: 'validation_triggers_human_review',
    validates: ['governance path', 'world model review packet', 'surface visibility'],
  },
  {
    name: 'new_capability_added_via_manifest',
    validates: ['automatic discovery', 'no orchestrator refactor required'],
  },
] as const;
