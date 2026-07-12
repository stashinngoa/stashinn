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

/**
 * Mock External Notification Service
 * In a production environment, this would integrate with SendGrid/Twilio/WhatsApp Business API
 */
export const ExternalNotificationService = {
  sendEmail: async (to: string, subject: string, body: string) => {
    console.log(`[EXTERNAL_EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`[EXTERNAL_EMAIL_BODY]\n${body}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `msg_${Math.random().toString(36).substr(2, 9)}` };
  },

  sendWhatsApp: async (phone: string, templateName: string, variables: Record<string, string>) => {
    console.log(`[EXTERNAL_WHATSAPP] To: ${phone} | Template: ${templateName}`);
    console.log(`[EXTERNAL_WHATSAPP_VARS] ${JSON.stringify(variables)}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `wa_${Math.random().toString(36).substr(2, 9)}` };
  },

  sendSMS: async (phone: string, message: string) => {
    console.log(`[EXTERNAL_SMS] To: ${phone} | Message: ${message}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `sms_${Math.random().toString(36).substr(2, 9)}` };
  }
};

/**
 * Notifies a partner based on their configured preferences.
 */
export async function notifyPartnerExternal(partnerId: string, payload: { title: string, message: string }) {
  const supabase = await createClient();

  // 1. Get Partner User ID & contact info
  const { data: partner } = await supabase
    .from('partners')
    .select('user_id, business_name, users(email, phone)')
    .eq('id', partnerId)
    .single();

  if (!partner) return;
  
  const userId = partner.user_id;
  const email = (partner.users as any)?.email;
  const phone = (partner.users as any)?.phone || '+910000000000'; // Default mock phone

  // 2. Get preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const activePrefs = prefs || { in_app: true, email: true, whatsapp: false, sms: false };

  // 3. Dispatch based on preferences
  if (activePrefs.in_app) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseService.from('notifications').insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      category: 'booking'
    });
  }

  if (activePrefs.email && email) {
    await ExternalNotificationService.sendEmail(email, payload.title, payload.message);
  }

  if (activePrefs.whatsapp) {
    await ExternalNotificationService.sendWhatsApp(phone, 'partner_alert', { message: payload.message });
  }

  if (activePrefs.sms) {
    await ExternalNotificationService.sendSMS(phone, `StashInn: ${payload.title} - ${payload.message}`);
  }
}
