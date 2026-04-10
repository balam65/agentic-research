import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CapabilityModule } from './types';

export class CapabilityRegistry {
  constructor(private readonly manifestUrl: URL | string) {}

  async load(): Promise<CapabilityModule[]> {
    const manifestPath = typeof this.manifestUrl === 'string' 
      ? (this.manifestUrl.startsWith('file://') ? fileURLToPath(this.manifestUrl) : this.manifestUrl)
      : fileURLToPath(this.manifestUrl);
    
    const manifestDir = dirname(manifestPath);
    const content = await readFile(manifestPath, 'utf8');
    const db = JSON.parse(content);
    
    const capabilities: CapabilityModule[] = [];

    for (const item of db.capabilities) {
      let description = '';
      try {
        if (item.descriptor) {
            const mdPath = resolve(manifestDir, item.descriptor);
            description = await readFile(mdPath, 'utf8');
        }
      } catch(e) {
          console.warn(`Could not read descriptor for ${item.id}`, e);
      }

      const descriptor = {
        id: item.id,
        version: '1.0.0',
        description: description || `Capability: ${item.id}`,
        inputs: [],
        outputs: [],
        executionContract: item.module,
        tags: [item.id]
      };

      try {
          // Dynamically load the module logic if it exists
          const modulePath = resolve(manifestDir, item.module);
          const moduleUrl = pathToFileURL(modulePath).href;
          const imported = await import(moduleUrl);
          
          // Identify the logic provider (either the module itself or the default export)
          const logicProvider = imported.canHandle ? imported : (imported.default?.canHandle ? imported.default : null);
          
          if (logicProvider && typeof logicProvider.canHandle === 'function') {
              capabilities.push({
                  descriptor,
                  canHandle: logicProvider.canHandle.bind(logicProvider)
              });
          } else {
              // Fallback to a dummy if module found but no canHandle
              capabilities.push({
                  descriptor,
                  async canHandle() { return 0; }
              });
          }
      } catch (e) {
          console.warn(`Could not load implementation module for ${item.id} at ${item.module}. Using metadata-only stub.`, e);
          capabilities.push({
            descriptor,
            async canHandle() { return 0; }
          });
      }
    }

    return capabilities;
  }
}
