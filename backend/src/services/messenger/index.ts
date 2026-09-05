import { MESSENGER_PROVIDER } from "../../config";
import { LogMessenger } from "./log";
import type { MailInput, MessengerProvider, SmsInput } from "./types";

let provider: MessengerProvider | null = null;

/**
 * Selects the messenger provider from MESSENGER_PROVIDER:
 *   "log"  - development provider (console + logs/messenger.log)
 *   "smtp" - reserved for a real SMTP implementation (falls back to log
 *            until SMTP_HOST is configured)
 *   other  - reserved for future providers (Twilio SMS, Termii, ...)
 */
export function getMessenger(): MessengerProvider {
  if (provider) return provider;
  const selected = (MESSENGER_PROVIDER ?? "log").toLowerCase();
  switch (selected) {
    case "smtp": {
      if (process.env.SMTP_HOST) {
        // Connect nodemailer-style SMTP here in production.
        console.warn("[messenger] SMTP provider not yet wired; using log messenger.");
      }
      provider = new LogMessenger();
      break;
    }
    case "twilio":
    case "termii":
      console.warn(`[messenger] ${selected} provider not yet wired; using log messenger.`);
      provider = new LogMessenger();
      break;
    default:
      provider = new LogMessenger();
  }
  return provider;
}

export async function sendEmail(input: MailInput): Promise<boolean> {
  try {
    return await getMessenger().sendEmail(input);
  } catch (err) {
    console.error("[messenger:email]", err);
    return false;
  }
}

export async function sendSms(input: SmsInput): Promise<boolean> {
  try {
    return await getMessenger().sendSms(input);
  } catch (err) {
    console.error("[messenger:sms]", err);
    return false;
  }
}