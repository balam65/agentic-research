import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder_key';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.error("Supabase environment variables are missing! UI will load but data cannot be fetched.");
}

export type Database = {
  public: {
    Tables: {
      research_jobs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          status: 'pending' | 'running' | 'hitl_alert' | 'completed' | 'failed';
          input_params: any | null;
          final_output_url: string | null;
          priority: number | null;
        };
        Insert: Omit<Database['public']['Tables']['research_jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['research_jobs']['Insert']>;
      };
      world_events: {
        Row: {
          id: string;
          job_id: string | null;
          timestamp: string;
          event_type: string;
          source: string;
          message: string | null;
          payload: any | null;
        };
        Insert: Omit<Database['public']['Tables']['world_events']['Row'], 'id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['world_events']['Insert']>;
      };
      extracted_data: {
        Row: {
          id: string;
          job_id: string | null;
          created_at: string;
          source_url: string | null;
          content: any | null;
          confidence: number | null;
          is_validated: boolean | null;
        };
        Insert: Omit<Database['public']['Tables']['extracted_data']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['extracted_data']['Insert']>;
      };
      capability_registry: {
        Row: {
          id: string;
          name: string;
          version: string | null;
          is_active: boolean | null;
          description: string | null;
          config: any | null;
        };
        Insert: Omit<Database['public']['Tables']['capability_registry']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['capability_registry']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          webhook_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      delivery_jobs: {
        Row: {
          id: string;
          client_id: string | null;
          data_id: string | null;
          format: string | null;
          delivery_type: string | null;
          status: string | null;
          retry_count: number | null;
          scheduled_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['delivery_jobs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['delivery_jobs']['Insert']>;
      };
      delivery_logs: {
        Row: {
          id: string;
          client_id: string | null;
          data_id: string | null;
          format: string | null;
          delivery_type: string | null;
          status: string | null;
          response: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['delivery_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['delivery_logs']['Insert']>;
      };
      processed_data: {
        Row: {
          id: string;
          client_id: string | null;
          payload: any | null;
          status: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['processed_data']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['processed_data']['Insert']>;
      };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
