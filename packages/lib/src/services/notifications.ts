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
    
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const isHtml = body.trim().startsWith('<');
        const htmlBody = isHtml ? body : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #9333ea; margin-top: 0;">StashInn</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #333; white-space: pre-line;">${body}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #666; margin-bottom: 0;">This is an automated notification from StashInn. Please do not reply directly to this email.</p>
        </div>`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'StashInn <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: htmlBody
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          console.log(`[RESEND_SUCCESS] Email sent successfully. Message ID: ${resData.id}`);
          return { success: true, messageId: resData.id };
        } else {
          const errText = await response.text();
          console.error(`[RESEND_ERROR] Failed to send email via Resend: ${errText}`);
        }
      } catch (err) {
        console.error('[RESEND_EXCEPTION] Exception occurred while calling Resend API:', err);
      }
    } else {
      console.log(`[EXTERNAL_EMAIL_MOCK_FALLBACK] RESEND_API_KEY not set. Body:\n${body}`);
    }

    // Simulate network delay for mock fallback
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `msg_${Math.random().toString(36).substr(2, 9)}` };
  },

  sendWhatsApp: async (phone: string, templateName: string, variables: Record<string, string>) => {
    console.log(`[EXTERNAL_WHATSAPP] To: ${phone} | Template: ${templateName}`);
    console.log(`[EXTERNAL_WHATSAPP_VARS] ${JSON.stringify(variables)}`);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (accountSid && authToken) {
      try {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const recipient = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
        
        let body = `StashInn: Notification Alert (${templateName})`;
        if (variables.message) {
          body = variables.message;
        }

        const params = new URLSearchParams();
        params.append('To', recipient);
        params.append('From', fromWhatsapp);
        params.append('Body', body);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        if (response.ok) {
          const resData = await response.json();
          console.log(`[TWILIO_WHATSAPP_SUCCESS] Message SID: ${resData.sid}`);
          return { success: true, messageId: resData.sid };
        } else {
          const errText = await response.text();
          console.error(`[TWILIO_WHATSAPP_ERROR] Failed to send WhatsApp via Twilio: ${errText}`);
        }
      } catch (err) {
        console.error('[TWILIO_WHATSAPP_EXCEPTION] Exception sending WhatsApp via Twilio:', err);
      }
    } else {
      console.log(`[EXTERNAL_WHATSAPP_MOCK_FALLBACK] Twilio WhatsApp variables not set.`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `wa_${Math.random().toString(36).substr(2, 9)}` };
  },

  sendSMS: async (phone: string, message: string) => {
    console.log(`[EXTERNAL_SMS] To: ${phone} | Message: ${message}`);
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromPhone) {
      try {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', phone);
        params.append('From', fromPhone);
        params.append('Body', message);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        if (response.ok) {
          const resData = await response.json();
          console.log(`[TWILIO_SMS_SUCCESS] Message SID: ${resData.sid}`);
          return { success: true, messageId: resData.sid };
        } else {
          const errText = await response.text();
          console.error(`[TWILIO_SMS_ERROR] Failed to send SMS via Twilio: ${errText}`);
        }
      } catch (err) {
        console.error('[TWILIO_SMS_EXCEPTION] Exception sending SMS via Twilio:', err);
      }
    } else {
      console.log(`[EXTERNAL_SMS_MOCK_FALLBACK] Twilio SMS variables not set.`);
    }

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
