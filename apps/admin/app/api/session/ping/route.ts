import { NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_OPTIONS, encodeActivity } from '../../../../lib/sessionPolicy';

// Called by the dashboard when the admin is actually active (mouse, keyboard, scroll…).
// Middleware has already rejected missing or expired sessions before this runs.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(ACTIVITY_COOKIE, encodeActivity(user.id), ACTIVITY_COOKIE_OPTIONS);
  return res;
}
