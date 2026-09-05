import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { MailInput, MessengerProvider, SmsInput } from "./types";

const logDir = join(process.cwd(), "logs");
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
const stream = createWriteStream(join(logDir, "messenger.log"), { flags: "a" });

/**
 * Development messenger: writes every email/SMS to the console and an
 * append-only log file (logs/messenger.log). Swap for SMTP/SMS providers in
 * production via the MESSENGER_PROVIDER env var (see index.ts).
 */
export class LogMessenger implements MessengerProvider {
  readonly name = "log";

  async sendEmail(input: MailInput): Promise<boolean> {
    const entry = JSON.stringify({ kind: "email", ts: new Date().toISOString(), to: input.to, subject: input.subject, text: input.text, html: input.html });
    stream.write(entry + "\n");
    console.log(`[messenger:email] ${input.subject} -> ${input.to}\n${input.text}`);
    return true;
  }

  async sendSms(input: SmsInput): Promise<boolean> {
    const entry = JSON.stringify({ kind: "sms", ts: new Date().toISOString(), to: input.to, text: input.text });
    stream.write(entry + "\n");
    console.log(`[messenger:sms] -> ${input.to}\n${input.text}`);
    return true;
  }
}