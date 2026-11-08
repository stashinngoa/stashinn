import { createClient, createAdminClient } from '../supabase/server';
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
  const supabase = await createAdminClient();

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
    !admin.admin_role || 
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

// Reuse one SMTP connection pool per server process
let mailTransport: import('nodemailer').Transporter | null = null;

async function getMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;
  if (!mailTransport) {
    const nodemailer = await import('nodemailer');
    const port = Number(SMTP_PORT) || 465;
    mailTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL; 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      pool: true,
    });
  }
  return mailTransport;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Wraps plain-text messages in a simple branded layout; HTML bodies are sent as-is. */
function toHtml(body: string) {
  if (body.trim().startsWith('<')) return body;
  return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
    <h2 style="color: #ea580c; margin-top: 0;">StashInn</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #333; white-space: pre-line;">${escapeHtml(body)}</p>
    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
    <p style="font-size: 12px; color: #666; margin-bottom: 0;">This is an automated notification from StashInn. Please do not reply directly to this email.</p>
  </div>`;
}

/**
 * External notification channels (email, WhatsApp, SMS).
 * Email goes out over SMTP — the same mailbox Supabase Auth uses (see .env.example: SMTP_*).
 */
export const ExternalNotificationService = {
  sendEmail: async (to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const transport = await getMailTransport();
    if (!transport) {
      console.warn(`[EMAIL_NOT_SENT] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD). To: ${to} | Subject: ${subject}`);
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const info = await transport.sendMail({
        from: process.env.EMAIL_FROM || `StashInn <${process.env.SMTP_USER}>`,
        replyTo: process.env.EMAIL_REPLY_TO || undefined,
        to,
        subject,
        html: toHtml(body),
        text: body.trim().startsWith('<') ? undefined : body,
      });
      console.log(`[EMAIL_SENT] To: ${to} | Subject: ${subject} | Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EMAIL_ERROR] To: ${to} | Subject: ${subject} |`, err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
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
/** In-app + external notification for a partner, following their notification preferences.
 *  Pass `email` to send a formatted email instead of the plain title/message. */
export async function notifyPartnerExternal(partnerId: string, payload: { title: string, message: string, email?: { subject: string, html: string } }) {
  const supabase = await createAdminClient();

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
    await ExternalNotificationService.sendEmail(email, payload.email?.subject ?? payload.title, payload.email?.html ?? payload.message);
  }

  if (activePrefs.whatsapp) {
    await ExternalNotificationService.sendWhatsApp(phone, 'partner_alert', { message: payload.message });
  }

  if (activePrefs.sms) {
    await ExternalNotificationService.sendSMS(phone, `StashInn: ${payload.title} - ${payload.message}`);
  }
}
