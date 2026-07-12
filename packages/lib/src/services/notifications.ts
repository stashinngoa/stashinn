import { createClient } from '../supabase/server';
import { AdminRole } from '../types/index';

interface BroadcastParams {
  title: string;
  message: string;
  category: 'booking' | 'payment' | 'review' | 'damage' | 'system' | 'promotion';
  targetRoles: AdminRole[];
  action_url?: string;
}

/**
 * Broadcasts a notification to all admins who hold one of the target granular roles.
 * Superadmins always receive notifications by default.
 */
export async function notifyAdmins(params: BroadcastParams) {
  const supabase = await createClient();

  // Find all admins matching the roles (or superadmins)
  const { data: admins, error } = await supabase
    .from('users')
    .select('id, admin_role')
    .eq('role', 'admin');

  if (error || !admins) {
    console.error('Failed to fetch admins for notification routing', error);
    return;
  }

  // Filter admins based on routing rules
  const targetAdmins = admins.filter((admin: any) => 
    admin.admin_role === 'superadmin' || 
    params.targetRoles.includes(admin.admin_role as AdminRole)
  );

  if (targetAdmins.length === 0) return;

  // Prepare payload
  const notifications = targetAdmins.map((admin: any) => ({
    user_id: admin.id,
    title: params.title,
    message: params.message,
    category: params.category,
    action_url: params.action_url
  }));

  // Insert notifications in bulk
  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('Failed to broadcast admin notifications', insertError);
  }
}
