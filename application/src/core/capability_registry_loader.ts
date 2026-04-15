import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

import { createLogger } from '../logs/logger.js';
import type { CapabilityModule } from './capability_types.js';

const logger = createLogger('capability-registry-loader');

export class CapabilityRegistry {
  constructor(private readonly manifestUrl: URL | string) {}

  async load(): Promise<CapabilityModule[]> {
    const manifestPath = typeof this.manifestUrl === 'string'
      ? (this.manifestUrl.startsWith('file://') ? fileURLToPath(this.manifestUrl) : this.manifestUrl)
      : fileURLToPath(this.manifestUrl);

    const manifestDir = dirname(manifestPath);
    const content = await readFile(manifestPath, 'utf8');
    const db = JSON.parse(content) as { capabilities: Array<{ id: string; module: string; descriptor?: string }> };

    const capabilities: CapabilityModule[] = [];

    for (const item of db.capabilities) {
      let description = '';
      try {
        if (item.descriptor) {
          const mdPath = resolve(manifestDir, item.descriptor);
          description = await readFile(mdPath, 'utf8');
        }
      } catch {
        logger.warn(`Could not read descriptor for ${item.id}`);
      }

      const descriptor = {
        id: item.id,
        version: '1.0.0',
        description: description || `Capability: ${item.id}`,
        inputs: [] as string[],
        outputs: [] as string[],
        executionContract: item.module,
        tags: [item.id],
      };

      try {
        const modulePath = resolve(manifestDir, item.module);
        const moduleUrl = pathToFileURL(modulePath).href;
        const imported = await import(moduleUrl);

        const logicProvider = imported.canHandle ? imported : (imported.default?.canHandle ? imported.default : null);

        if (logicProvider && typeof logicProvider.canHandle === 'function') {
          capabilities.push({
            descriptor,
            canHandle: logicProvider.canHandle.bind(logicProvider),
          });
        } else {
          capabilities.push({
            descriptor,
            async canHandle() { return 0; },
          });
        }
      } catch {
        logger.warn(`Could not load module for ${item.id}. Using metadata-only stub.`);
        capabilities.push({
          descriptor,
          async canHandle() { return 0; },
        });
      }
    }

    logger.info('Capabilities loaded', { count: capabilities.length });
    return capabilities;
  }
}
