import { WorldModelEvent } from '../../world_model/store';
export declare class ProxyManagerCapability {
    private store;
    private activeSessions;
    private readonly MAX_CONCURRENT_SESSIONS;
    private readonly PROXY_POOL_SIZE;
    constructor();
    acquireProxySession(scriptEvent: WorldModelEvent): Promise<null | undefined>;
    releaseSession(): void;
}
//# sourceMappingURL=index.d.ts.map