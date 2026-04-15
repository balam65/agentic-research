import { WorldView, TaskRecord } from '../memory/schema.js';

export interface CapabilityDescriptor {
  id: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: string[];
  executionContract: string;
  tags: string[];
}

export interface CapabilityModule {
  descriptor: CapabilityDescriptor;
  canHandle(context: { world: WorldView, task: TaskRecord }): Promise<number>;
}
