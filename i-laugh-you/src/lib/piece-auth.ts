import crypto from "node:crypto";

const PIECE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PIECE_SESSION_COOKIE_PREFIX = "ily_piece_session_";

interface PieceTokenPayload {
  imageId: number;
  exp: number;
}

function getPieceSessionSecret() {
  const configuredSecret = process.env.PIECE_SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-piece-session-secret-change-me";
  }

  throw new Error("PIECE_SESSION_SECRET must be configured in production.");
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadBase64Url: string) {
  return crypto
    .createHmac("sha256", getPieceSessionSecret())
    .update(payloadBase64Url)
    .digest("base64url");
}

export function generatePiecePassword() {
  return crypto.randomBytes(9).toString("base64url");
}

export function createPiecePasswordHash(password: string, salt?: string) {
  const resolvedSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, resolvedSalt, 64).toString("hex");

  return {
    hash,
    salt: resolvedSalt,
  };
}

export function verifyPiecePasswordHash(
  password: string,
  expectedHash: string,
  salt: string
) {
  const calculated = crypto.scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const calculatedBuffer = Buffer.from(calculated, "utf8");

  if (expectedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
}

export function getPieceSessionCookieName(imageId: number) {
  return `${PIECE_SESSION_COOKIE_PREFIX}${imageId}`;
}

export function createPieceSessionToken(imageId: number) {
  const payload: PieceTokenPayload = {
    imageId,
    exp: Math.floor(Date.now() / 1000) + PIECE_SESSION_TTL_SECONDS,
  };

  const payloadBase64Url = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadBase64Url);

  return `${payloadBase64Url}.${signature}`;
}

export function verifyPieceSessionToken(
  token: string | undefined,
  expectedImageId?: number
) {
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
    ) as PieceTokenPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    if (
      typeof expectedImageId === "number" &&
      payload.imageId !== expectedImageId
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getPieceSessionCookieOptions(imageId: number) {
  return {
    name: getPieceSessionCookieName(imageId),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIECE_SESSION_TTL_SECONDS,
  };
}
