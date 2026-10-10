/**
 * Mock Messaging Service for StashInn
 * Simulates third-party API calls (Twilio, WhatsApp Business) for sending SMS and WhatsApp messages.
 */

export interface MessagingPayload {
  to: string; // phone number
  message: string;
}

export async function sendSMS({ to, message }: MessagingPayload): Promise<boolean> {
  console.log(`[SMS] Sending to: ${to} | Message: ${message}`);
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromPhone) {
    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', to);
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
        return true;
      } else {
        const errText = await response.text();
        console.error(`[TWILIO_SMS_ERROR] Failed to send SMS via Twilio: ${errText}`);
      }
    } catch (err) {
      console.error('[TWILIO_SMS_EXCEPTION] Exception sending SMS via Twilio:', err);
    }
  } else {
    console.log(`[MOCK SMS FALLBACK] Twilio environment variables not set. Content:\n${message}`);
  }

  // Simulate network delay for fallback mock
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
}

export async function sendWhatsApp({ to, message }: MessagingPayload): Promise<boolean> {
  console.log(`[WhatsApp] Sending to: ${to} | Message: ${message}`);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (accountSid && authToken) {
    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      const params = new URLSearchParams();
      params.append('To', recipient);
      params.append('From', fromWhatsapp);
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
        console.log(`[TWILIO_WHATSAPP_SUCCESS] Message SID: ${resData.sid}`);
        return true;
      } else {
        const errText = await response.text();
        console.error(`[TWILIO_WHATSAPP_ERROR] Failed to send WhatsApp via Twilio: ${errText}`);
      }
    } catch (err) {
      console.error('[TWILIO_WHATSAPP_EXCEPTION] Exception sending WhatsApp via Twilio:', err);
    }
  } else {
    console.log(`[MOCK WHATSAPP FALLBACK] Twilio environment variables not set. Content:\n${message}`);
  }

  // Simulate network delay for fallback mock
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
}


export async function sendWhatsAppOTP({ to, otp }: { to: string; otp: string }): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'stashinn_otp';

  if (!token || !phoneId) {
    console.log(`[WhatsApp Mock] WHATSAPP_API_TOKEN or PHONE_ID missing. Would have sent OTP: ${otp} to ${to}`);
    return false;
  }

  // Meta requires country code without the '+'
  const cleanNumber = to.replace('+', '').trim();
  const endpoint = `https://graph.facebook.com/v20.0/${phoneId}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanNumber,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US" // Adjust to 'en' or your template's language if needed
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otp
                }
              ]
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: otp
                }
              ]
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[WhatsApp Meta] Successfully sent OTP to ${cleanNumber}. Message ID: ${data.messages?.[0]?.id}`);
      return true;
    } else {
      console.error(`[WhatsApp Meta] Failed:`, JSON.stringify(data.error));
      
      // If failure was due to button parameter mismatch, try fallback without button
      if (data.error?.message?.includes('button')) {
        console.log('[WhatsApp Meta] Retrying without button parameters...');
        const retryResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [ { type: "text", text: otp } ]
                }
              ]
            }
          })
        });
        if (retryResponse.ok) return true;
      }
      return false;
    }
  } catch (err) {
    console.error("[WhatsApp Meta] Exception:", err);
    return false;
  }
}

export async function sendZavuOTP({ to, otp }: { to: string; otp: string }): Promise<{ success: boolean, method?: 'whatsapp' | 'sms' }> {
  console.log(`[OTP Engine] Initiating OTP delivery cascade for: ${to} | OTP: ${otp}`);
  
  // 1. Attempt WhatsApp First
  const waSuccess = await sendWhatsAppOTP({ to, otp });
  if (waSuccess) {
    return { success: true, method: 'whatsapp' }; // Stop here if WhatsApp succeeded
  }

  console.log(`[OTP Engine] WhatsApp failed or not configured. Falling back to Fast2SMS Quick API...`);

  // 2. Fallback to Fast2SMS (Quick API Route - ₹5/SMS but requires no DLT)
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.error("[Fast2SMS] FAST2SMS_API_KEY is missing!");
    return { success: false };
  }

  const cleanNumber = to.replace('+91', '').replace('+', '').trim();

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "route": "q",
        "message": `Your StashInn login code is: ${otp}`,
        "flash": 0,
        "numbers": cleanNumber
      })
    });

    const data = await response.json();
    
    if (data.return) {
      console.log(`[Fast2SMS] Success: Quick SMS sent to ${cleanNumber}. Request ID: ${data.request_id}`);
      return { success: true, method: 'sms' };
    } else {
      console.error(`[Fast2SMS] Error:`, data.message);
      return { success: false };
    }
  } catch (err) {
    console.error("[Fast2SMS] Exception:", err);
    return { success: false };
  }
}

