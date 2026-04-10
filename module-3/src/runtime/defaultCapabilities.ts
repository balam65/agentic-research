import { AssessmentService } from "../capabilities/assessmentService";
import { DiscoveryService } from "../capabilities/discoveryService";
import { ExtractionService } from "../capabilities/extractionService";
import { ProxyManagerService } from "../capabilities/proxyManagerService";
import { QaValidationService } from "../capabilities/qaValidationService";
import { SchedulingService } from "../capabilities/schedulingService";
import { ScriptingService } from "../capabilities/scriptingService";
import type { CapabilityService } from "../types/contracts";

export function createDefaultCapabilityServices(): CapabilityService[] {
  return [
    new AssessmentService(),
    new SchedulingService(),
    new DiscoveryService(),
    new ScriptingService(),
    new ProxyManagerService(),
    new ExtractionService(),
    new QaValidationService()
  ];
}
