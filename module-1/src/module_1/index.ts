import { v4 as uuidv4 } from 'uuid';
import { JobRequestSchema, ValidatedModuleEvent } from './schema';

export class InputContractModule {
  
  /**
   * Processes a raw, unstructured JSON payload from an API or Client.
   * Validates it, applies defaults, and constructs the standardized Input Event.
   * 
   * @param rawRequest - Unstructured input representing the client's request
   * @returns A structured ValidatedModuleEvent representing the exact structure Module 2 expects.
   */
  public processRequirement(rawRequest: unknown): ValidatedModuleEvent {
    try {
      // 1. Validate and sanitize against the schema. Strips out malicious or unknown keys.
      const parsedPayload = JobRequestSchema.parse(rawRequest);

      // 2. Wrap into the standardized Module 2 Event Bus structure
      const eventId = `req-${uuidv4().substring(0, 8)}`;
      
      const outgoingEvent: ValidatedModuleEvent = {
        event_id: eventId,
        event_type: 'INPUT_CONTRACT_VALIDATED',
        timestamp: new Date().toISOString(),
        payload: parsedPayload,
        confidence_score: 1.0, 
        justification: "Initial requirement successfully structured and validated."
      };

      return outgoingEvent;

    } catch (error: any) {
      // If validation fails (ZodError), we can intercept it here and throw a clean error
      throw new Error(`Input Validation Failed: ${error.message || 'Invalid Request Contract'}`);
    }
  }
}
