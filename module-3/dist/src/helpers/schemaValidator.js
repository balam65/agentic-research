"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
const contracts_1 = require("../types/contracts");
class SchemaValidator {
    static validate(schema, data) {
        const errors = [];
        this.validateNode("$", schema, data, errors);
        return {
            valid: errors.length === 0,
            errors
        };
    }
    static validateNode(path, expected, actual, errors) {
        if (typeof expected === "string") {
            const actualType = this.inferType(actual);
            if (actualType !== expected) {
                errors.push(`Type mismatch at ${path}. Expected ${expected}, received ${actualType}`);
            }
            return;
        }
        if (!(0, contracts_1.isRecord)(expected)) {
            errors.push(`Invalid schema definition at ${path}`);
            return;
        }
        if (!(0, contracts_1.isRecord)(actual)) {
            errors.push(`Type mismatch at ${path}. Expected object, received ${this.inferType(actual)}`);
            return;
        }
        const expectedRecord = expected;
        for (const [key, nextSchema] of Object.entries(expectedRecord)) {
            if (!(key in actual)) {
                errors.push(`Missing required field ${path}.${key}`);
                continue;
            }
            this.validateNode(`${path}.${key}`, nextSchema, actual[key], errors);
        }
    }
    static inferType(value) {
        if (Array.isArray(value))
            return "array";
        if (value === null)
            return "null";
        return typeof value;
    }
}
exports.SchemaValidator = SchemaValidator;
