import { createHmac, randomInt } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeAccessCode(value: string) {
  return value.trim().toLocaleUpperCase().replace(/\s/g, "");
}

export function isAccessCodeFormat(value: string) {
  return /^QAI-[A-Z2-9]{6}$/.test(normalizeAccessCode(value));
}

export function generateAccessCode() {
  return `QAI-${Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length)]).join("")}`;
}

export function accessCodeHash(code: string) {
  const pepper = process.env.ACCESS_CODE_PEPPER || (process.env.NODE_ENV === "production" ? "" : "quantro-local-access-code-pepper");
  if (!pepper) throw new Error("ACCESS_CODE_PEPPER is required in production.");
  return createHmac("sha256", pepper).update(normalizeAccessCode(code)).digest("hex");
}
