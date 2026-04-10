"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryService = void 0;
const contracts_1 = require("../types/contracts");
class DiscoveryService {
    name = "discovery";
    consumes = ["job_scheduled"];
    produces = ["url_discovered", "discovery_failed"];
    async execute(_context, event) {
        if (!(0, contracts_1.isRecord)(event.payload) || typeof event.payload.target_domain !== "string") {
            return [this.failedEvent(event, "Scheduling payload missing target_domain")];
        }
        const targetDomain = event.payload.target_domain.trim().toLowerCase();
        if (!targetDomain) {
            return [this.failedEvent(event, "target_domain cannot be empty")];
        }
        return [
            {
                event_name: "url_discovered",
                job_id: event.job_id,
                payload: {
                    target_domain: targetDomain,
                    discovered_url: `https://${targetDomain}/research`,
                    domain_authority: 85
                },
                confidence_score: 0.92,
                justification: "Discovery mapped domain to target extraction URL."
            }
        ];
    }
    failedEvent(event, message) {
        return {
            event_name: "discovery_failed",
            job_id: event.job_id,
            payload: { error: message },
            confidence_score: 0.4,
            justification: message
        };
    }
}
exports.DiscoveryService = DiscoveryService;
