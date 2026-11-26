const encoder = new TextEncoder();

export const SESSION_COOKIE = "bench_sid";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    console.warn("[session] SESSION_SECRET is missing; using an insecure fallback");
  }
  return value ?? "bench-dev-secret-not-for-production";
}

function base64url(bytes: Uint8Array): string {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(id: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(id));
  return base64url(new Uint8Array(signature));
}

export async function createSession(): Promise<string> {
  const id = crypto.randomUUID();
  return `${id}.${await sign(id)}`;
}

export async function verifySession(
  value: string | undefined | null,
): Promise<string | null> {
  if (!value) return null;

  const dot = value.indexOf(".");
  if (dot < 1) return null;

  const id = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = await sign(id);

  if (signature.length !== expected.length) return null;

  let diff = 0;
  for (let i = 0; i < signature.length; i += 1) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return diff === 0 ? id : null;
}
