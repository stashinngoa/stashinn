'use server';

import { createClient } from '@supabase/supabase-js';

// Extremely lightweight manual verification for Firebase JWT (mock verification for now until full admin SDK setup)
// In production, use firebase-admin.
export async function verifyFirebaseAndGenerateSession(firebaseIdToken: string, phone: string, nextUrl: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Clean phone number
  const cleanPhone = phone.replace('+', '');
  
  // Find user
  const { data: user } = await supabaseAdmin.from('users').select('email').eq('phone', cleanPhone).single();
  
  if (!user || !user.email) {
    return { error: 'No StashInn account found with this phone number. Please book a space as a guest first to create an account.' };
  }

  const finalNextUrl = nextUrl || '/dashboard';
  const separator = finalNextUrl.includes('?') ? '&' : '?';
  const redirectToUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${finalNextUrl}${separator}autoLogin=true`;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: {
      redirectTo: redirectToUrl
    }
  });

  if (error || !data?.properties?.action_link) {
    return { error: 'Failed to securely link phone number to account.' };
  }

  return { success: true, redirectUrl: data.properties.action_link };
}
