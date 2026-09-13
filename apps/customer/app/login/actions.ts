'use server';

import { createClient } from '@supabase/supabase-js';
import { sendZavuOTP } from '@stashinn/lib/services/messaging';
import crypto from 'crypto';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stashinn-otp-secret-key';

function signOTP(identifier: string, otp: string, expiresAt: number) {
  return crypto.createHmac('sha256', SECRET).update(`${identifier}:${otp}:${expiresAt}`).digest('hex');
}

export async function requestOTP(identifier: string) {
  const supabaseAdmin = getSupabaseAdmin();
  let email = identifier;
  
  if (!identifier.includes('@')) {
    const { data: user } = await supabaseAdmin.from('users').select('email').eq('phone', identifier).single();
    if (user && user.email) {
      email = user.email;
    } else {
      return { error: 'No account found with this phone number.' };
    }
  } else {
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (!user) {
      return { error: 'No account found with this email. Please book a space to create an account.' };
    }
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  
  // Sign the OTP
  const hash = signOTP(identifier, otp, expiresAt);
  const verificationToken = `${expiresAt}.${hash}`;

  // Call Messaging API wrapper (WhatsApp/Fast2SMS)
  await sendZavuOTP({ to: identifier, otp });

  return { success: true, verificationToken };
}

export async function verifyOTP(identifier: string, enteredOtp: string, nextUrl: string, verificationToken?: string) {
  let isValid = false;

  if (enteredOtp === '123456') {
    isValid = true; // Master bypass for local testing
  } else if (verificationToken) {
    const [expiresAtStr, hash] = verificationToken.split('.');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return { error: 'OTP has expired. Please request a new one.' };
    }

    const expectedHash = signOTP(identifier, enteredOtp, expiresAt);
    if (expectedHash === hash) {
      isValid = true;
    }
  }

  if (!isValid) {
    return { error: 'Invalid OTP.' };
  }
  
  // OTP is valid, generate magic link to establish session
  otpStore.delete(identifier);
  const supabaseAdmin = getSupabaseAdmin();
  
  let email = identifier;
  if (!identifier.includes('@')) {
    const { data: user } = await supabaseAdmin.from('users').select('email').eq('phone', identifier).single();
    if (user && user.email) email = user.email;
  }
  
  const finalNextUrl = nextUrl || '/dashboard';
  const separator = finalNextUrl.includes('?') ? '&' : '?';
  const redirectToUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${finalNextUrl}${separator}autoLogin=true`;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: {
      redirectTo: redirectToUrl
    }
  });
  
  if (error || !data?.properties?.action_link) {
    return { error: 'Failed to generate authentication link.' };
  }
  
  return { success: true, redirectUrl: data.properties.action_link };
}
