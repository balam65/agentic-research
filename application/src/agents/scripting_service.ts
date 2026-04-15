import { createLogger } from '../logs/logger.js';
import type { CapabilityContext } from '../tools/capability_context.js';
import type { CapabilityService, PipelineEvent } from '../utils/contracts.js';
import { isRecord } from '../utils/contracts.js';

const logger = createLogger('scripting-service');

/**
 * Scripting capability — generates Playwright extraction scripts
 * dynamically based on the schema definition and target URL analysis.
 */
export class ScriptingService implements CapabilityService {
  name = "scripting";
  consumes = ["url_discovered"];
  produces = ["script_ready", "scripting_failed"];

  async execute(context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.discovered_url !== "string") {
      return [this.failedEvent(event, "Discovery payload missing discovered_url")];
    }

    const targetUrl = event.payload.discovered_url;
    const schema = context.input.extracted_schema_definition;
    const schemaFields = Object.entries(schema);

    // --- Real script generation logic ---

    // Build CSS selector hints from schema field names
    const selectorHints = schemaFields.map(([field, type]) => {
      const typeStr = typeof type === 'string' ? type : 'object';
      return this.generateSelectorHint(field, typeStr);
    });

    // Generate the Playwright script
    const extractionSelectors = selectorHints
      .map(hint => `    const ${hint.field} = await page.textContent('${hint.selector}') ?? null;`)
      .join('\n');

    const returnFields = selectorHints.map(hint => `      ${hint.field}`).join(',\n');

    const playwrightScript = `
// Auto-generated extraction script for ${targetUrl}
// Schema fields: ${schemaFields.map(([f]) => f).join(', ')}
async function extract(page) {
  await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

${extractionSelectors}

  return {
${returnFields}
  };
}`.trim();

    const scriptId = `script-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    logger.info('Script generated', {
      targetUrl,
      scriptId,
      fieldCount: schemaFields.length,
      scriptLength: playwrightScript.length,
    }, event.job_id);

    return [
      {
        event_name: "script_ready",
        job_id: event.job_id,
        payload: {
          target_url: targetUrl,
          script_id: scriptId,
          playwright_script: playwrightScript,
          script_metadata: {
            field_count: schemaFields.length,
            selectors_generated: selectorHints.length,
            estimated_execution_ms: 5000 + (schemaFields.length * 500),
          }
        },
        confidence_score: 0.88,
        justification: `Generated Playwright script for ${schemaFields.length} fields targeting '${targetUrl}'.`
      }
    ];
  }

  private generateSelectorHint(fieldName: string, fieldType: string): { field: string; selector: string } {
    const normalized = fieldName.toLowerCase();

    // Common field-to-selector mappings
    const selectorMap: Record<string, string> = {
      title: 'h1, [data-testid="title"], .title',
      name: 'h1, .product-name, [itemprop="name"]',
      price: '[data-testid="price"], .price, [itemprop="price"]',
      description: '[data-testid="description"], .description, [itemprop="description"], meta[name="description"]',
      content: 'article, main, .content, #content',
      image: 'img[src], [data-testid="image"]',
      url: 'link[rel="canonical"]',
      rating: '[itemprop="ratingValue"], .rating',
      category: '[itemprop="category"], .category, nav.breadcrumb',
    };

    const matchedSelector = selectorMap[normalized] ??
      `[data-testid="${fieldName}"], .${fieldName}, #${fieldName}`;

    return {
      field: fieldName.replace(/[^a-zA-Z0-9_]/g, '_'),
      selector: matchedSelector,
    };
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    logger.warn('Scripting failed', { error: message }, event.job_id);
    return {
      event_name: "scripting_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.4,
      justification: message
    };
  }
}
