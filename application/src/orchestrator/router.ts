import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import type { ValidatedInputEvent, WorkflowRunResult } from '../../../world_model/schema';

/**
 * Bridge the CommonJS application server to the ESM intelligence layer by
 * delegating routing to a short-lived child process running ts-node's ESM loader.
 */
export class OrchestratorRouter {
  async handleEvent(event: ValidatedInputEvent): Promise<WorkflowRunResult> {
    const bridgeScript = resolve(__dirname, '../../../interfaces/submit_request.ts');
    const tsNodeEsmLoader = resolve(__dirname, '../../node_modules/ts-node/esm.mjs');

    return new Promise<WorkflowRunResult>((resolvePromise, rejectPromise) => {
      const child = spawn(
        process.execPath,
        ['--loader', tsNodeEsmLoader, bridgeScript],
        {
          cwd: resolve(__dirname, '../../..'),
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
             resolvePromise(JSON.parse(cleanString) as WorkflowRunResult);
          } else {
             resolvePromise(JSON.parse(content) as WorkflowRunResult);
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
