import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import disposableDomains from "disposable-email-domains" with { type: "json" };
import { Resend } from "resend";

const disposableDomainSet = new Set(disposableDomains as string[]);
export const emailCodeLifetimeMs = 10 * 60 * 1000;
const emailPattern = /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

export type EmailCodePayload = {
  email: string;
  expiresAt: number;
  signature: string;
};

export type EmailLanguage = "fr" | "en";

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) return null;

  const [local, originalDomain] = email.split("@");
  const domain = originalDomain === "googlemail.com" ? "gmail.com" : originalDomain;
  const localWithoutTag = local.split("+", 1)[0];
  const normalizedLocal = domain === "gmail.com" ? localWithoutTag.replace(/\./g, "") : localWithoutTag;
  if (!normalizedLocal) return null;
  return `${normalizedLocal}@${domain}`;
}

export function isDisposableEmail(email: string) {
  return disposableDomainSet.has(email.split("@")[1] ?? "");
}

function createSignature(secret: string, email: string, code: string, expiresAt: number) {
  return createHmac("sha256", secret).update(`${email}:${code}:${expiresAt}`).digest("hex");
}

export function createEmailCodeProof(secret: string, email: string, code: string, expiresAt: number) {
  const payload: EmailCodePayload = {
    email,
    expiresAt,
    signature: createSignature(secret, email, code, expiresAt),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function verifyEmailCodeProof(
  value: string,
  code: string,
  secret: string,
  now = Date.now(),
): { email: string } | { error: "invalid_code" | "expired_code" } {
  let payload: EmailCodePayload;
  try {
    payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as EmailCodePayload;
  } catch {
    return { error: "invalid_code" };
  }
  if (!payload.email || !Number.isFinite(payload.expiresAt) || typeof payload.signature !== "string") {
    return { error: "invalid_code" };
  }
  if (payload.expiresAt <= now) return { error: "expired_code" };

  const expected = Buffer.from(createSignature(secret, payload.email, code, payload.expiresAt), "hex");
  const actual = Buffer.from(payload.signature, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { error: "invalid_code" };
  return { email: payload.email };
}

export function generateEmailCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function buildVerificationEmail(code: string, language: EmailLanguage) {
  const copy = language === "fr"
    ? {
      subject: "Votre code de vérification | 5 Sens Advertising",
      title: "Confirmez votre adresse email",
      greeting: "Bonjour,",
      instruction: "Utilisez le code ci-dessous pour confirmer votre adresse et continuer votre diagnostic.",
      expiry: "Ce code expire dans 10 minutes.",
      ignore: "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
      footer: "Une première étape vers une communication plus claire.",
      codeLabel: "VOTRE CODE DE VÉRIFICATION",
    }
    : {
      subject: "Your verification code | 5 Sens Advertising",
      title: "Confirm your email address",
      greeting: "Hello,",
      instruction: "Use the code below to confirm your address and continue your diagnostic.",
      expiry: "This code expires in 10 minutes.",
      ignore: "If you didn't request this code, you can safely ignore this email.",
      footer: "A first step toward clearer communications.",
      codeLabel: "YOUR VERIFICATION CODE",
    };

  return {
    subject: copy.subject,
    text: `${copy.greeting}\n\n${copy.instruction}\n\n${copy.codeLabel}: ${code}\n${copy.expiry}\n\n${copy.ignore}\n\n5 Sens Advertising`,
    html: `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${copy.subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f2ec;color:#1b2a4a;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.instruction}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ec;padding:36px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffefa;border:1px solid #e7e2d8;">
          <tr><td style="height:5px;background:#b08d57;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:28px 36px 8px;text-align:center;">
            <p style="margin:0;color:#b08d57;font-size:11px;font-weight:bold;letter-spacing:2px;">5 SENS ADVERTISING</p>
            <h1 style="margin:24px 0 0;color:#1b2a4a;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;line-height:1.25;">${copy.title}</h1>
          </td></tr>
          <tr><td style="padding:20px 36px 0;color:#515967;font-size:15px;line-height:1.65;">
            <p style="margin:0 0 12px;">${copy.greeting}</p>
            <p style="margin:0;">${copy.instruction}</p>
          </td></tr>
          <tr><td style="padding:26px 36px 8px;text-align:center;">
            <p style="margin:0 0 10px;color:#74777c;font-size:10px;font-weight:bold;letter-spacing:1.5px;">${copy.codeLabel}</p>
            <div style="display:inline-block;padding:15px 24px;border:1px solid #e7e2d8;background:#faf9f5;color:#1b2a4a;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:bold;letter-spacing:8px;line-height:1.2;">${code}</div>
            <p style="margin:14px 0 0;color:#8b6c3f;font-size:13px;font-weight:bold;">${copy.expiry}</p>
          </td></tr>
          <tr><td style="padding:18px 36px 30px;color:#74777c;font-size:12px;line-height:1.6;text-align:center;">
            <p style="margin:0;">${copy.ignore}</p>
          </td></tr>
          <tr><td style="padding:16px 24px;border-top:1px solid #e7e2d8;color:#74777c;font-size:11px;line-height:1.5;text-align:center;">${copy.footer}<br>5 Sens Advertising · Doctor Com</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export async function sendEmailVerificationCode(email: string, code: string, language: EmailLanguage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error("Resend is not configured");

  const content = buildVerificationEmail(code, language);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  if (error) throw new Error(`Resend rejected the verification email: ${error.message}`);
}