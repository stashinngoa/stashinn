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
  const apiKey = process.env.WHATSAPP_API_KEY;
  const endpoint = process.env.WHATSAPP_API_ENDPOINT;

  if (!apiKey || !endpoint) {
    console.log(`[WhatsApp Mock] WHATSAPP_API_KEY or ENDPOINT missing. Would have sent OTP: ${otp} to ${to}`);
    return false; // Force fallback to SMS if not configured
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: to,
        message: `Your StashInn verification code is: ${otp}. Valid for 5 minutes.`,
        // Adjust these payload keys based on your specific WhatsApp provider (Zavu/Interakt/Wati)
      })
    });

    if (response.ok) {
      console.log(`[WhatsApp] Successfully sent OTP to ${to}`);
      return true;
    } else {
      console.error(`[WhatsApp] Failed:`, await response.text());
      return false;
    }
  } catch (err) {
    console.error("[WhatsApp] Exception:", err);
    return false;
  }
}

export async function sendZavuOTP({ to, otp }: { to: string; otp: string }): Promise<boolean> {
  console.log(`[OTP Engine] Initiating OTP delivery cascade for: ${to} | OTP: ${otp}`);
  
  // 1. Attempt WhatsApp First
  const waSuccess = await sendWhatsAppOTP({ to, otp });
  if (waSuccess) {
    return true; // Stop here if WhatsApp succeeded
  }

  console.log(`[OTP Engine] WhatsApp failed or not configured. Falling back to Fast2SMS...`);

  // 2. Fallback to Fast2SMS
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.error("[Fast2SMS] FAST2SMS_API_KEY is missing!");
    return false;
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
        "variables_values": otp,
        "route": "otp",
        "numbers": cleanNumber
      })
    });

    const data = await response.json();
    
    if (data.return) {
      console.log(`[Fast2SMS] Success: SMS sent to ${cleanNumber}. Request ID: ${data.request_id}`);
      return true;
    } else {
      console.error(`[Fast2SMS] Error:`, data.message);
      return false;
    }
  } catch (err) {
    console.error("[Fast2SMS] Exception:", err);
    return false;
  }
}

