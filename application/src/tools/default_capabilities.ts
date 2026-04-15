import { AssessmentService } from '../agents/assessment_service.js';
import { DiscoveryService } from '../agents/discovery_service.js';
import { ExtractionService } from '../agents/extraction_service.js';
import { ProxyManagerService } from '../agents/proxy_manager_service.js';
import { QaValidationService } from '../agents/qa_validation_service.js';
import { SchedulingService } from '../agents/scheduling_service.js';
import { ScriptingService } from '../agents/scripting_service.js';
import type { CapabilityService } from '../utils/contracts.js';

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
