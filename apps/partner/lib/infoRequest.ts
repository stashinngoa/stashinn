import type { createClient } from '@stashinn/lib/supabase/server';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

/**
 * Called after a partner saves changes in an area the StashInn team flagged
 * (partners.info_request_items). Marks the open request as answered so the banner
 * switches to "we'll take another look" and admins see "Partner says done".
 */
export async function markInfoRequestAnswered(supabase: Awaited<ReturnType<typeof createClient>>, partnerId: string, area: string) {
  const { data: partner } = await supabase
    .from('partners')
    .select('business_name, info_requested_at, info_responded_at, info_request_items')
    .eq('id', partnerId)
    .maybeSingle();
  if (!partner?.info_requested_at || partner.info_responded_at) return;
  if (!(partner.info_request_items || []).includes(area)) return;

  const { error } = await supabase.from('partners').update({ info_responded_at: new Date().toISOString() }).eq('id', partnerId);
  if (error) return;

  await notifyAdmins({
    title: 'Partner updated requested details',
    message: `${partner.business_name} updated their ${area.replace('_', ' ')} after your info request.`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: `/dashboard/partners/${partnerId}`,
  });
}
