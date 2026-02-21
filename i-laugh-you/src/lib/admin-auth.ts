import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "ily_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface AdminCredentials {
  username: string;
  password: string;
  source: "env" | "dev_default";
}

interface AdminTokenPayload {
  username: string;
  exp: number;
}

function getSessionSecret() {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-admin-session-secret-change-me";
  }

  throw new Error("ADMIN_SESSION_SECRET must be configured in production.");
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadBase64Url: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadBase64Url)
    .digest("base64url");
}

export function getAdminCredentials(): AdminCredentials {
  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();

  if (envUsername && envPassword) {
    return {
      username: envUsername,
      password: envPassword,
      source: "env",
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      username: "admin",
      password: "admin123",
      source: "dev_default",
    };
  }

  throw new Error(
    "ADMIN_USERNAME and ADMIN_PASSWORD must be configured in production."
  );
}

export function getAdminCredentialHint() {
  const credentials = getAdminCredentials();

  if (process.env.NODE_ENV === "production") {
    return {
      show: false,
      username: credentials.username,
      password: "",
    };
  }

  return {
    show: true,
    username: credentials.username,
    password: credentials.password,
  };
}

export function verifyAdminLogin(username: string, password: string) {
  const credentials = getAdminCredentials();
  return (
    username.trim() === credentials.username && password === credentials.password
  );
}

export function createAdminSessionToken(username: string) {
  const payload: AdminTokenPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };

  const payloadBase64Url = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadBase64Url);

  return `${payloadBase64Url}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [payloadBase64Url, providedSignature] = token.split(".");
  if (!payloadBase64Url || !providedSignature) {
    return false;
  }

  const expectedSignature = sign(payloadBase64Url);
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      fromBase64Url(payloadBase64Url)
    ) as AdminTokenPayload;

    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}
