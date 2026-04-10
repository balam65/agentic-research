import { WorldView, TaskRecord } from '../world_model/schema';

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
