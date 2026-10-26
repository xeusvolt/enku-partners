// SMS Ethiopia API Client for Cloudflare Edge Runtime
import { normalizeEthiopianPhone } from './phone';

export interface SendSmsResult {
  success: boolean;
  message?: string;
  statusCode?: number;
}

/**
 * Sends an SMS message via SMS Ethiopia (smsethiopia.com) API.
 * 
 * Contract:
 * - URL: https://smsethiopia.com/api/sms/send
 * - Headers: KEY: <api_key>, Content-Type: application/json
 * - Body: { msisdn: "2519XXXXXXXX", text: "..." }
 */
export async function sendSmsEthiopia(
  phone: string,
  message: string,
  apiKey?: string
): Promise<SendSmsResult> {
  if (!apiKey) {
    console.warn('[SMS] Skipped: SMS_ETHIOPIA_API_KEY is not configured.');
    return { success: false, message: 'SMS API key missing' };
  }

  const norm = normalizeEthiopianPhone(phone);
  if (!norm) {
    console.warn('[SMS] Invalid recipient phone format:', phone);
    return { success: false, message: 'Invalid phone format' };
  }

  // Convert 09... or 07... to international digits without plus: 2519... or 2517...
  const msisdn = `251${norm.slice(1)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://smsethiopia.com/api/sms/send', {
      method: 'POST',
      headers: {
        'KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        msisdn,
        text: message
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      console.log(`[SMS] Notification dispatched successfully to ${msisdn.slice(0, 5)}****`);
      return { success: true, statusCode: response.status };
    } else {
      const errText = await response.text().catch(() => '');
      console.error(`[SMS] Failed with HTTP status ${response.status}: ${errText.slice(0, 100)}`);
      return { success: false, statusCode: response.status, message: `HTTP ${response.status}` };
    }
  } catch (err: any) {
    console.error('[SMS] Network or dispatch exception occurred');
    return { success: false, message: err?.message || 'Network error' };
  }
}
