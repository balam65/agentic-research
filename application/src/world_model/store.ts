import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Note: In production, these should be securely injected via environment variables.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
export class WorldModelStore {
  /**
   * Write an event to the shared event bus (Supabase PostgreSQL)
   */
  async publishEvent(eventData: WorldModelEvent) {
    const { data, error } = await supabase
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
  async getRecentEvents(eventName?: string, limit = 100) {
    let query = supabase
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
