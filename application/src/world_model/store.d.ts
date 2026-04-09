export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export interface WorldModelEvent {
    event_name: string;
    source_agent_run_id: string;
    entity_id?: string;
    payload: any;
    confidence_score: number;
    justification: string;
}
/**
 * Shared Context / Event Store
 * This enables the World Model by providing a single source of truth
 * for situational awareness across all capabilities and agents.
 */
export declare class WorldModelStore {
    /**
     * Write an event to the shared event bus (Supabase PostgreSQL)
     */
    publishEvent(eventData: WorldModelEvent): Promise<any[]>;
    /**
     * Retrieve recent state or events for situational awareness
     */
    getRecentEvents(eventName?: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=store.d.ts.map