import { createLogger } from '../logs/logger.js';
import { SchemaValidator } from '../utils/schema_validator.js';
import type { CapabilityContext } from '../tools/capability_context.js';
import type { CapabilityService, PipelineEvent } from '../utils/contracts.js';
import { isRecord } from '../utils/contracts.js';

const logger = createLogger('qa-validation-service');

/**
 * QA/Validation capability — validates extracted data against schema,
 * performs completeness checks, and applies quality gates.
 */
export class QaValidationService implements CapabilityService {
  name = "qa_validation";
  consumes = ["extraction_completed"];
  produces = ["qa_validated", "qa_failed"];

  async execute(context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || !isRecord(event.payload.extracted_data)) {
      return [this.failedEvent(event, "Extraction payload missing extracted_data object")];
    }

    const extractedData = event.payload.extracted_data as Record<string, unknown>;

    // --- Real validation logic ---

    // 1. Schema validation
    const validation = SchemaValidator.validate(
      context.input.extracted_schema_definition,
      extractedData
    );

    // 2. Completeness check — count non-null fields
    const schemaFields = Object.keys(context.input.extracted_schema_definition);
    const populatedFields = schemaFields.filter(field => {
      const value = extractedData[field];
      return value !== null && value !== undefined && value !== '';
    });
    const completenessRatio = schemaFields.length > 0
      ? populatedFields.length / schemaFields.length
      : 0;

    // 3. Data quality checks
    const qualityIssues: string[] = [];

    for (const [field, value] of Object.entries(extractedData)) {
      // Skip metadata fields
      if (field.startsWith('_')) continue;

      // Check for suspiciously short strings
      if (typeof value === 'string' && value.length > 0 && value.length < 2) {
        qualityIssues.push(`Field '${field}' has suspiciously short value (${value.length} chars)`);
      }

      // Check for placeholder-like values
      if (typeof value === 'string' && /^mock_|^placeholder|^test_|^TODO/i.test(value)) {
        qualityIssues.push(`Field '${field}' appears to contain placeholder data`);
      }
    }

    // 4. Calculate overall quality score
    const schemaScore = validation.valid ? 1.0 : 0.5;
    const completenessScore = completenessRatio;
    const qualityScore = qualityIssues.length === 0 ? 1.0 : Math.max(0.3, 1 - (qualityIssues.length * 0.15));

    const overallScore = (schemaScore * 0.4) + (completenessScore * 0.35) + (qualityScore * 0.25);

    // 5. Apply quality gate
    const MINIMUM_QUALITY_THRESHOLD = 0.5;
    const allErrors = [...validation.errors, ...qualityIssues];

    if (overallScore < MINIMUM_QUALITY_THRESHOLD) {
      logger.warn('QA validation failed', {
        overallScore,
        schemaScore,
        completenessScore,
        qualityScore,
        errors: allErrors,
      }, event.job_id);

      return [
        {
          event_name: "qa_failed",
          job_id: event.job_id,
          payload: {
            errors: allErrors,
            scores: {
              schema: schemaScore,
              completeness: completenessScore,
              quality: qualityScore,
              overall: overallScore,
            }
          },
          confidence_score: overallScore,
          justification: `QA failed: overall score ${overallScore.toFixed(2)} below threshold ${MINIMUM_QUALITY_THRESHOLD}. ${allErrors.length} issue(s) found.`
        }
      ];
    }

    // Filter out internal metadata from validated output
    const validatedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(extractedData)) {
      if (!key.startsWith('_')) {
        validatedData[key] = value;
      }
    }

    context.sharedState.set("validated_data", validatedData);

    logger.info('QA validation passed', {
      overallScore,
      completenessRatio,
      fieldCount: Object.keys(validatedData).length,
      issueCount: allErrors.length,
    }, event.job_id);

    return [
      {
        event_name: "qa_validated",
        job_id: event.job_id,
        payload: {
          validated_data: validatedData,
          quality_report: {
            schema_score: schemaScore,
            completeness_score: completenessScore,
            quality_score: qualityScore,
            overall_score: overallScore,
            populated_fields: populatedFields.length,
            total_fields: schemaFields.length,
            issues: allErrors,
          }
        },
        confidence_score: Math.min(event.confidence_score ?? 1, overallScore),
        justification: `QA passed with score ${overallScore.toFixed(2)} (${populatedFields.length}/${schemaFields.length} fields, ${allErrors.length} issues).`
      }
    ];
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    logger.warn('QA validation failed', { error: message }, event.job_id);
    return {
      event_name: "qa_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.55,
      justification: message
    };
  }
}
