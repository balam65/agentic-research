import { readFile } from 'node:fs/promises';

import type { CapabilityModule } from './types.js';

interface ManifestEntry {
  id: string;
  module: string;
}

interface CapabilityManifest {
  capabilities: ManifestEntry[];
}

export class CapabilityRegistry {
  constructor(private readonly manifestPath: URL) {}

  async load(): Promise<CapabilityModule[]> {
    const raw = await readFile(this.manifestPath, 'utf8');
    const manifest = JSON.parse(raw) as CapabilityManifest;
    const loaded = await Promise.all(
      manifest.capabilities.map(async (entry) => {
        const moduleUrl = new URL(entry.module, this.manifestPath);
        const imported = (await import(moduleUrl.href)) as { default: CapabilityModule };
        return imported.default;
      }),
    );
    return loaded;
  }
}
