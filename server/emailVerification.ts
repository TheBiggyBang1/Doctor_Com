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

export async function sendEmailVerificationCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error("Resend is not configured");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Votre code de vérification / Your verification code",
    text: `Votre code de vérification est : ${code}\nIl est valable pendant 10 minutes.\n\nYour verification code is: ${code}\nIt is valid for 10 minutes.`,
  });
  if (error) throw new Error(`Resend rejected the verification email: ${error.message}`);
}