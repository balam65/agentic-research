import { WorldModelStore, WorldModelEvent } from '../../world_model/store';

export class ProxyManagerCapability {
    private store: WorldModelStore;
    private activeSessions: number = 0;
    private readonly MAX_CONCURRENT_SESSIONS = 10;
    private readonly PROXY_POOL_SIZE = 20;

    constructor() {
        this.store = new WorldModelStore();
    }

    async acquireProxySession(scriptEvent: WorldModelEvent) {
        if (this.activeSessions >= this.MAX_CONCURRENT_SESSIONS) {
            console.log(`[CapProxy] Concurrency limit reached (${this.MAX_CONCURRENT_SESSIONS}). Yielding event.`);
            // In a real system, we might push back to queue or let orchestrator handle retry logic
            return null; 
        }

        this.activeSessions++;
        const proxyId = `proxy-pool-node-${Math.floor(Math.random() * this.PROXY_POOL_SIZE) + 1}`;
        console.log(`[CapProxy] Acquired session ${this.activeSessions}/${this.MAX_CONCURRENT_SESSIONS} via ${proxyId}`);

        await this.store.publishEvent({
            event_name: 'proxy_acquired',
            source_agent_run_id: scriptEvent.source_agent_run_id,
            entity_id: scriptEvent.entity_id,
            payload: {
                ...scriptEvent.payload,
                proxy_id: proxyId,
                anti_bot_evasion_enabled: true
            },
            confidence_score: 1.0,
            justification: "Assigned active residential proxy from rotating pool to bypass Cloudflare."
        });
    }

    releaseSession() {
        if (this.activeSessions > 0) this.activeSessions--;
    }
}
