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
