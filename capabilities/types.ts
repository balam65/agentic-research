import { WorldModelStore } from '../world_model/event_store.js';
import { ArtifactKind, ArtifactRecord, NonNegotiableInput, TaskRecord, WorldView } from '../world_model/schema.js';

export interface CapabilityDescriptor {
  id: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: ArtifactKind[];
  executionContract: string;
  tags: string[];
}

export interface CapabilityContext {
  store: WorldModelStore;
  task: TaskRecord;
  world: WorldView;
  input: NonNegotiableInput;
}

export interface CapabilityResult {
  status: 'completed' | 'blocked' | 'failed' | 'human_review';
  artifacts?: Array<Omit<ArtifactRecord, 'id' | 'taskId' | 'createdAt'>>;
  reason: string;
  retriable?: boolean;
  metrics?: Array<{
    source: string;
    name: string;
    value: number;
    unit: string;
  }>;
}

export interface CapabilityModule {
  descriptor: CapabilityDescriptor;
  canHandle(context: CapabilityContext): Promise<number>;
  execute(context: CapabilityContext): Promise<CapabilityResult>;
}
