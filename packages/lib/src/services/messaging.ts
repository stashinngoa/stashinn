/**
 * Mock Messaging Service for StashInn
 * Simulates third-party API calls (Twilio, WhatsApp Business) for sending SMS and WhatsApp messages.
 */

export interface MessagingPayload {
  to: string; // phone number
  message: string;
}

export async function sendSMS({ to, message }: MessagingPayload): Promise<boolean> {
  // In production, initialize Twilio client and send message.
  // const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // await twilioClient.messages.create({ body: message, to, from: process.env.TWILIO_FROM });
  
  console.log(`[MOCK SMS] To: ${to} | Message: ${message}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
}

export async function sendWhatsApp({ to, message }: MessagingPayload): Promise<boolean> {
  // In production, use WhatsApp Business API or Twilio WhatsApp API.
  console.log(`[MOCK WHATSAPP] To: ${to} | Message: ${message}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
}
