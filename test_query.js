const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/partner/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, users(email, full_name)')
    .limit(1);
    
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
