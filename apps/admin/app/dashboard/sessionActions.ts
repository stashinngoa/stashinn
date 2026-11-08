'use server';

import { cookies } from 'next/headers';
import { createClient } from '@stashinn/lib/supabase/server';
import { logger } from '@stashinn/lib/services/logger';
import { ACTIVITY_COOKIE, type SignOutReason } from '../../lib/sessionPolicy';

// Ends the admin session when the browser-side timer expires
export async function endSession(reason: SignOutReason) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVITY_COOKIE);
  logger.info('Admin session ended automatically', { userId: user?.id, reason });
}
