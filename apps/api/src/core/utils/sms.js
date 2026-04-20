import twilio from 'twilio';
import { env } from '../../config/env.js';

let _client = null;

function getClient() {
  if (!_client) {
    if (!env.twilioAccountSid || !env.twilioAuthToken) return null;
    _client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return _client;
}

/**
 * Send an SMS message.
 * @param {string} to   - E.164 recipient phone number, e.g. "+12125551234"
 * @param {string} body - Message text (max 1600 chars for concatenated SMS)
 * @returns {Promise<string>} Twilio message SID
 * @throws {Error} when Twilio credentials or from-number are not configured
 */
export async function sendSms(to, body) {
  const client = getClient();
  if (!client) {
    throw new Error('SMS not configured: set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  if (!env.twilioFromNumber) {
    throw new Error('SMS not configured: set TWILIO_FROM_NUMBER.');
  }

  const message = await client.messages.create({
    from: env.twilioFromNumber,
    to,
    body
  });

  return message.sid;
}

/**
 * Returns true when all Twilio credentials are present.
 */
export function smsConfigured() {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber);
}
