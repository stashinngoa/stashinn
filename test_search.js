import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vfpbmcggqwwqcbeyfihp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcGJtY2dncXd3cWNiZXlmaWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjAxODUyOSwiZXhwIjoyMDkxNTk0NTI5fQ.A40xLHmpkYv7ESO7wX6G47ZfiDJOnbhbwwEsy70h4ak';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('search_nearby_locations', {
    search_lat: 15.5908530,
    search_lng: 73.8102146,
    radius_km: 50.0
  });
  console.log("RPC Data:", data);
  console.log("RPC Error:", error);

  const { data: pData } = await supabase.from('partners').select('id, status').limit(2);
  console.log("Partners:", pData);
}

run();
