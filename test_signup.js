import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vfpbmcggqwwqcbeyfihp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Wait, I will extract it from the file

async function testSignup() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  console.log('Testing Partner Signup...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test_partner_script_999@stashinn.com',
    password: 'password123',
    options: {
      data: {
        full_name: 'Test Partner',
        role: 'partner'
      }
    }
  });

  if (error) {
    console.error('Signup Error:', error);
  } else {
    console.log('Signup Success:', data.user?.id);
    
    // Check if the trigger inserted them into public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    console.log('Profile fetch:', profileError || profile);
  }
}

testSignup();
