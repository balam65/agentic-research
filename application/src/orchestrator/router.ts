import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import type { RoutingDecision, ValidatedInputEvent } from '../world_model/schema';

/**
 * Bridge the CommonJS application server to the ESM intelligence layer by
 * delegating routing to a short-lived child process running ts-node's ESM loader.
 */
export class OrchestratorRouter {
  async handleEvent(event: ValidatedInputEvent): Promise<RoutingDecision> {
    const bridgeScript = resolve(__dirname, 'run_intelligence_bridge.mjs');
    const tsxPath = resolve(__dirname, '../../node_modules/tsx/dist/cli.mjs');

    return new Promise<RoutingDecision>((resolvePromise, rejectPromise) => {
      const child = spawn(
        process.execPath,
        [tsxPath, '--no-warnings', bridgeScript],
        {
          cwd: resolve(__dirname, '../..'),
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        rejectPromise(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          rejectPromise(new Error(stderr.trim() || `Intelligence bridge exited with code ${code}.`));
          return;
        }

        try {
          // Robustly handle cases where dependencies leak text into stdout by finding the JSON boundary
          const content = stdout.trim();
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1) {
             const cleanString = content.substring(firstBrace, lastBrace + 1);
             resolvePromise(JSON.parse(cleanString) as RoutingDecision);
          } else {
             resolvePromise(JSON.parse(content) as RoutingDecision);
          }
        } catch (error) {
          rejectPromise(
            new Error(
              `Failed to parse intelligence bridge output: ${
                error instanceof Error ? error.message : 'Unknown parse error'
              }`,
            ),
          );
        }
      });

      child.stdin.write(JSON.stringify(event));
      child.stdin.end();
    });
  }
}
