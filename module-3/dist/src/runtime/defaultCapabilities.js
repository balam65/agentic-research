"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultCapabilityServices = createDefaultCapabilityServices;
const assessmentService_1 = require("../capabilities/assessmentService");
const discoveryService_1 = require("../capabilities/discoveryService");
const extractionService_1 = require("../capabilities/extractionService");
const proxyManagerService_1 = require("../capabilities/proxyManagerService");
const qaValidationService_1 = require("../capabilities/qaValidationService");
const schedulingService_1 = require("../capabilities/schedulingService");
const scriptingService_1 = require("../capabilities/scriptingService");
function createDefaultCapabilityServices() {
    return [
        new assessmentService_1.AssessmentService(),
        new schedulingService_1.SchedulingService(),
        new discoveryService_1.DiscoveryService(),
        new scriptingService_1.ScriptingService(),
        new proxyManagerService_1.ProxyManagerService(),
        new extractionService_1.ExtractionService(),
        new qaValidationService_1.QaValidationService()
    ];
}
