"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldModelStore = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// Initialize Supabase Client
// Note: In production, these should be securely injected via environment variables.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
/**
 * Shared Context / Event Store
 * This enables the World Model by providing a single source of truth
 * for situational awareness across all capabilities and agents.
 */
class WorldModelStore {
    /**
     * Write an event to the shared event bus (Supabase PostgreSQL)
     */
    async publishEvent(eventData) {
        const { data, error } = await exports.supabase
            .from('world_model_events')
            .insert([eventData])
            .select();
        if (error) {
            console.error('Failed to publish event to World Model', error);
            throw error;
        }
        return data;
    }
    /**
     * Retrieve recent state or events for situational awareness
     */
    async getRecentEvents(eventName, limit = 100) {
        let query = exports.supabase
            .from('world_model_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (eventName) {
            query = query.eq('event_name', eventName);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Failed to retrieve events', error);
            throw error;
        }
        return data;
    }
}
exports.WorldModelStore = WorldModelStore;
//# sourceMappingURL=store.js.map