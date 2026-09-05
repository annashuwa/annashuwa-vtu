export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SmsInput {
  to: string;
  text: string;
}

export interface MessengerProvider {
  readonly name: string;
  sendEmail(input: MailInput): Promise<boolean>;
  sendSms(input: SmsInput): Promise<boolean>;
}