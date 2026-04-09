import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file variables from the root folder (where you created it)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // Also try current dir just in case
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Based on Intern 3 DB Schema
export interface WorldEvent {
  job_id: string; // Foreign key to research_jobs
  event_type: string;
  source: string;
  message?: string;
  payload?: any;
}

export interface ExtractedData {
  job_id: string;
  source_url: string;
  content: any; // JSONB
  confidence: number;
  is_validated?: boolean;
}

export interface CapabilityRegistry {
  name: string;
  version?: string;
  is_active?: boolean;
  description?: string;
  config?: any;
}

/**
 * Shared Context / Event Store 
 * This enables the World Model by providing a single source of truth 
 * for situational awareness across all capabilities and agents.
 */
export class DatabaseStore {
  /**
   * 1. Reporting State (world_events table)
   * Do not just use console.log! Every action must insert here.
   */
  async logEvent(event: WorldEvent) {
    const { data, error } = await supabase
      .from('world_events')
      .insert([event])
      .select();
      
    if (error) {
      console.error('Failed to log event to world_events', error);
      throw error;
    }
    
    return data;
  }

  /**
   * 2. Saving Results (extracted_data table)
   */
  async saveExtractedData(dataRecord: ExtractedData) {
    const { data, error } = await supabase
      .from('extracted_data')
      .insert([dataRecord])
      .select();
      
    if (error) {
      console.error('Failed to save extracted data', error);
      throw error;
    }
    
    return data;
  }

  /**
   * 3. Reading the Contract (research_jobs table)
   */
  async getJob(job_id: string) {
    const { data, error } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', job_id)
      .single();
      
    if (error) {
      console.error(`Failed to retrieve job ${job_id}`, error);
      throw error;
    }
    
    return data; // contains input_params JSONB
  }

  /**
   * Status updates for research_jobs routing
   */
  async updateJobStatus(job_id: string, status: 'pending' | 'running' | 'hitl_alert' | 'completed' | 'failed') {
    const { error } = await supabase
      .from('research_jobs')
      .update({ status })
      .eq('id', job_id);
      
    if (error) throw error;
  }
}
