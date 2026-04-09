import { supabase } from './world_model/store';

async function testConnection() {
    console.log("Testing Supabase Connection using your .env credentials...");
    try {
        // Ping the capability_registry table you created
        const { data, error } = await supabase.from('capability_registry').select('*').limit(1);
        if (error) {
            console.error("❌ Connection failed! Error:", error.message);
        } else {
            console.log("✅ SUCCESS! Connected to Supabase.");
            console.log("Data from capability_registry:", data);
        }
    } catch (e: any) {
        console.error("❌ Exception:", e.message);
    }
}

testConnection();
