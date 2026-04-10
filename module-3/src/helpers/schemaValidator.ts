import { isRecord } from "../types/contracts";

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

export class SchemaValidator {
  static validate(schema: Record<string, string | object>, data: unknown): SchemaValidationResult {
    const errors: string[] = [];
    this.validateNode("$", schema, data, errors);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static validateNode(path: string, expected: string | object, actual: unknown, errors: string[]): void {
    if (typeof expected === "string") {
      const actualType = this.inferType(actual);
      if (actualType !== expected) {
        errors.push(`Type mismatch at ${path}. Expected ${expected}, received ${actualType}`);
      }
      return;
    }

    if (!isRecord(expected)) {
      errors.push(`Invalid schema definition at ${path}`);
      return;
    }

    if (!isRecord(actual)) {
      errors.push(`Type mismatch at ${path}. Expected object, received ${this.inferType(actual)}`);
      return;
    }

    const expectedRecord = expected as Record<string, string | object>;
    for (const [key, nextSchema] of Object.entries(expectedRecord)) {
      if (!(key in actual)) {
        errors.push(`Missing required field ${path}.${key}`);
        continue;
      }
      this.validateNode(`${path}.${key}`, nextSchema, actual[key], errors);
    }
  }

  private static inferType(value: unknown): string {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value;
  }
}
