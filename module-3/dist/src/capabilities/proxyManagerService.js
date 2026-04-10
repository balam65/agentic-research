"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyManagerService = void 0;
const contracts_1 = require("../types/contracts");
class ProxyManagerService {
    name = "proxy_manager";
    consumes = ["script_ready"];
    produces = ["proxy_acquired", "proxy_failed"];
    async execute(_context, event) {
        if (!(0, contracts_1.isRecord)(event.payload) || typeof event.payload.target_url !== "string") {
            return [this.failedEvent(event, "Script payload missing target_url")];
        }
        const proxyId = `proxy-node-${Math.floor(Math.random() * 20) + 1}`;
        return [
            {
                event_name: "proxy_acquired",
                job_id: event.job_id,
                payload: {
                    target_url: event.payload.target_url,
                    script_id: event.payload.script_id,
                    proxy_id: proxyId,
                    anti_bot_evasion_enabled: true
                },
                confidence_score: 0.9,
                justification: "Proxy manager assigned rotating proxy session for extraction."
            }
        ];
    }
    failedEvent(event, message) {
        return {
            event_name: "proxy_failed",
            job_id: event.job_id,
            payload: { error: message },
            confidence_score: 0.4,
            justification: message
        };
    }
}
exports.ProxyManagerService = ProxyManagerService;
