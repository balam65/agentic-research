export type Database = {
    public: {
        Tables: {
            jobs: {
                Row: {
                    id: string;
                    status: 'pending' | 'running' | 'failed' | 'completed';
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
            };
            logs: {
                Row: {
                    id: number;
                    job_id: string;
                    step_name: string | null;
                    message: string | null;
                    log_level: 'info' | 'warning' | 'error' | null;
                    timestamp: string;
                };
                Insert: Omit<Database['public']['Tables']['logs']['Row'], 'id' | 'timestamp'>;
                Update: Partial<Database['public']['Tables']['logs']['Insert']>;
            };
            data: {
                Row: {
                    id: number;
                    job_id: string;
                    raw_data: any | null;
                    processed_data: any | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['data']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['data']['Insert']>;
            };
        };
    };
};
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<Database, "public", "public", never, {
    PostgrestVersion: "12";
}>;
//# sourceMappingURL=supabase.d.ts.map