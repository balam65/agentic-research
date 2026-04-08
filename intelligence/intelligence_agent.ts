import { readFile } from 'node:fs/promises';

import { CapabilityModule } from '../capabilities/types.js';
import { WorldView } from '../world_model/schema.js';
import { AgentDecision, parseAgentDecision } from './decision_schema.js';
import { DecisionGuard } from './decision_guard.js';
import { ModelClient } from './model_client.js';

interface CapabilityPromptContext {
  id: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: string[];
  executionContract: string;
  tags: string[];
  descriptorText?: string;
}

export class IntelligenceAgent {
  private readonly client = new ModelClient();
  private readonly guard = new DecisionGuard();

  constructor(
    private readonly systemPromptUrl: URL,
    private readonly capabilityDescriptorRoot: URL,
  ) {}

  async decide(world: WorldView, capabilities: CapabilityModule[]): Promise<AgentDecision> {
    const systemPrompt = await readFile(this.systemPromptUrl, 'utf8');
    const capabilityContext = await Promise.all(
      capabilities.map(async (capability) => ({
        id: capability.descriptor.id,
        version: capability.descriptor.version,
        description: capability.descriptor.description,
        inputs: capability.descriptor.inputs,
        outputs: capability.descriptor.outputs,
        executionContract: capability.descriptor.executionContract,
        tags: capability.descriptor.tags,
        descriptorText: await this.tryReadDescriptor(capability.descriptor.id),
      })),
    );

    const worldSummary = {
      task: {
        id: world.task.id,
        status: world.task.status,
        outputGoal: world.task.outputGoal,
        governance: world.task.governance,
        input: world.task.input,
      },
      artifacts: world.artifacts.map((artifact) => ({
        kind: artifact.kind,
        producedBy: artifact.producedBy,
        confidence: artifact.confidence ?? null,
        content: artifact.content,
      })),
      errors: world.errors,
      metrics: world.metrics,
      recentEvents: world.events.slice(-12),
    };

    const userPrompt = [
      'Choose the next capability dynamically from the provided registry.',
      'Do not assume a fixed pipeline. Use only current world state, capability contracts, and the non-negotiable output goals.',
      'Return JSON with keys: selected_capability_id, reasoning_summary, requires_human_review, stop_execution, confidence, missing_information.',
      '',
      `WORLD_STATE_JSON:\n${JSON.stringify(worldSummary, null, 2)}`,
      '',
      `CAPABILITY_REGISTRY_JSON:\n${JSON.stringify(capabilityContext, null, 2)}`,
    ].join('\n');

    const raw = await this.client.completeJson([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const decision = parseAgentDecision(raw);
    const guardResult = this.guard.validate(decision, capabilities);
    if (!guardResult.valid) {
      throw new Error(`Intelligence agent returned an invalid decision: ${guardResult.reason}`);
    }

    return decision;
  }

  private async tryReadDescriptor(capabilityId: string): Promise<string | undefined> {
    const descriptorUrl = new URL(`capabilities/${capabilityId}.md`, this.capabilityDescriptorRoot);
    try {
      return await readFile(descriptorUrl, 'utf8');
    } catch {
      return undefined;
    }
  }
}
