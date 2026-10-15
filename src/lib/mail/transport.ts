import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "@/lib/config";
import { getSmtpSettings, type SmtpSettings } from "./settings";

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendMail = (mail: OutgoingMail) => Promise<void>;

let cached: { key: string; transporter: Transporter } | undefined;

function transporterFor(smtp: SmtpSettings): Transporter {
  const key = JSON.stringify(smtp);
  if (cached?.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        // Without it, anyone on the path can strip STARTTLS and read the login in clear.
        // A relay on the same machine or network without TLS sets SMTP_ALLOW_PLAIN=true.
        requireTLS: !smtp.secure && Boolean(smtp.user) && !config.smtpAllowPlain,
        auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
        // A dead server must not hold a scheduler tick for minutes.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    };
  }
  return cached.transporter;
}

function fromAddress(smtp: SmtpSettings): string {
  // Without a sender, nodemailer would write `From: <>`, which most servers reject.
  const address = smtp.from || (smtp.user.includes("@") ? smtp.user : "guestroll@localhost");
  return address.includes("<") ? address : `"${config.appName.replace(/"/g, "")}" <${address}>`;
}

/** Sends through the configured SMTP server; throws when none is configured or it refuses. */
export const smtpSend: SendMail = async (mail) => {
  const smtp = getSmtpSettings();
  if (!smtp?.host) throw new Error("SMTP is not configured");
  await transporterFor(smtp).sendMail({ from: fromAddress(smtp), to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
};

/** Checks a configuration without saving it: connection, TLS and authentication. */
export async function verifySmtp(smtp: SmtpSettings): Promise<void> {
  await transporterFor(smtp).verify();
}
