import { Resend } from "resend";
import { tEmail } from "@/lib/email-i18n";
import { getPieceImageUrl } from "@/lib/piece-image";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    return (getResend() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "I LAUGH YOU <noreply@i-laugh-you.com>";

export interface PieceCredentialInfo {
  imageId: number;
  slug: string;
  password: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://i-laugh-you.com";

// -------------------- style tokens (email-safe inline) --------------------
const BG_PAGE = "#0a0a0a";
const BG_CARD = "#121222";
const BG_CARD_SOFT = "#1a1a2e";
const TEXT_LIGHT = "#f4f4f4";
const TEXT_MUTED = "#a0a0b0";
const ACCENT = "#ff0069";
const ACCENT_SOFT = "rgba(255, 0, 105, 0.15)";
const HERO_GRADIENT = "linear-gradient(135deg, #ff0069 0%, #7a0039 55%, #0a0a0a 100%)";

function frameLabel(locale: string, frameColor: string | undefined): string {
  if (frameColor === "white") return tEmail(locale, "framedInWhite");
  return tEmail(locale, "framedInBlack");
}

// -------------------- PURCHASE CONFIRMATION --------------------
export async function sendPurchaseConfirmation(input: {
  buyerEmail: string;
  buyerName: string;
  imageIds: number[];
  frameColors?: string[];
  totalAmount: string;
  currency: string;
  orderId: number;
  pieceCredentials: PieceCredentialInfo[];
  locale: string;
}) {
  const { locale } = input;
  const safeName = escapeHtml(input.buyerName);
  const safeTotal = escapeHtml(input.totalAmount);
  const safeCurrency = escapeHtml(input.currency);

  // Build the pieces grid — each piece gets its image + labels.
  const piecesHtml = input.imageIds
    .map((imageId, idx) => {
      const imgUrl = getPieceImageUrl(imageId);
      const pieceLabel = tEmail(locale, "pieceLabel", { id: imageId });
      const fc = input.frameColors?.[idx];
      const fLabel = frameLabel(locale, fc);
      return `
        <tr>
          <td align="center" style="padding: 14px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:320px;">
              <tr>
                <td align="center" style="background:${BG_CARD_SOFT}; border-radius:12px; padding:16px; border:1px solid rgba(255,255,255,0.06);">
                  <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(pieceLabel)}" width="280" height="280" style="display:block; width:280px; max-width:100%; height:auto; border-radius:8px; background:#222;" />
                  <div style="margin-top:14px; font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT}; font-size:18px; font-weight:700; letter-spacing:0.02em;">
                    ${escapeHtml(pieceLabel)}
                  </div>
                  <div style="margin-top:4px; font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:13px;">
                    ${escapeHtml(fLabel)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  // Password table rows
  const pieceRows = input.pieceCredentials
    .map((pc) => {
      const url = `${BASE_URL}/piece/${encodeURIComponent(pc.slug)}`;
      const pieceLabel = tEmail(locale, "pieceLabel", { id: pc.imageId });
      return `
        <tr>
          <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT}; font-size:14px; vertical-align:top;">
            <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(pieceLabel)}</div>
            <a href="${escapeHtml(url)}" style="color:${ACCENT}; text-decoration:none; font-size:12px; word-break:break-all;">${escapeHtml(url)}</a>
          </td>
          <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); font-family: 'Courier New', Courier, monospace; color:${TEXT_LIGHT}; font-size:15px; font-weight:700; letter-spacing:1.5px; vertical-align:top; text-align:right;">
            ${escapeHtml(pc.password)}
          </td>
        </tr>`;
    })
    .join("");

  const subject = tEmail(locale, "subject", { orderId: input.orderId });
  const heroTitle = tEmail(locale, "heroTitle", { name: input.buyerName });
  const heroSubtitle = tEmail(locale, "heroSubtitle");
  const orderLabel = tEmail(locale, "orderLabel");
  const piecesHeading = tEmail(locale, "piecesHeading");
  const totalLabel = tEmail(locale, "totalLabel");
  const productDescription = tEmail(locale, "productDescription");
  const shippingInfo = tEmail(locale, "shippingInfo");
  const accessHeading = tEmail(locale, "accessHeading");
  const accessIntro = tEmail(locale, "accessIntro");
  const passwordColumnPiece = tEmail(locale, "passwordColumnPiece");
  const passwordColumnPassword = tEmail(locale, "passwordColumnPassword");
  const emailSafeReminder = tEmail(locale, "emailSafeReminder");
  const trackingNotice = tEmail(locale, "trackingNotice");
  const artHistoryNote = tEmail(locale, "artHistoryNote");
  const footerTagline = tEmail(locale, "footerTagline");

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:${BG_PAGE}; font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_PAGE};">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px; background:${BG_CARD};">

          <!-- HERO -->
          <tr>
            <td style="background:${HERO_GRADIENT}; padding: 48px 32px 44px 32px;" align="center">
              <div style="font-family: Arial, Helvetica, sans-serif; color:#ffffff; font-size:32px; line-height:1.15; font-weight:800; letter-spacing:-0.01em; margin:0;">
                ${escapeHtml(heroTitle)}
              </div>
              <div style="display:inline-block; width:80px; height:4px; background:#ffffff; border-radius:2px; margin:18px 0 16px 0;"></div>
              <div style="font-family: Arial, Helvetica, sans-serif; color:rgba(255,255,255,0.92); font-size:15px; line-height:1.5; max-width:480px; margin:0 auto;">
                ${escapeHtml(heroSubtitle)}
              </div>
              <div style="margin-top:22px; font-family: Arial, Helvetica, sans-serif; color:rgba(255,255,255,0.85); font-size:13px; letter-spacing:0.08em; text-transform:uppercase;">
                ${escapeHtml(orderLabel)}${input.orderId}
              </div>
            </td>
          </tr>

          <!-- PIECES -->
          <tr>
            <td style="padding: 36px 24px 12px 24px;">
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT}; font-size:20px; font-weight:700; margin:0 0 6px 0; text-align:center; letter-spacing:0.02em;">
                ${escapeHtml(piecesHeading)}
              </div>
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:13px; text-align:center; margin:0 0 12px 0;">
                ${escapeHtml(productDescription)}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${piecesHtml}
              </table>
            </td>
          </tr>

          <!-- TOTAL -->
          <tr>
            <td style="padding: 16px 32px 8px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_CARD_SOFT}; border-radius:10px;">
                <tr>
                  <td style="padding: 18px 22px; font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:14px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase;">
                    ${escapeHtml(totalLabel)}
                  </td>
                  <td align="right" style="padding: 18px 22px; font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT}; font-size:22px; font-weight:800;">
                    ${safeTotal} ${safeCurrency}
                  </td>
                </tr>
              </table>
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:13px; line-height:1.5; margin: 18px 4px 0 4px; text-align:center;">
                ${escapeHtml(shippingInfo)}
              </div>
            </td>
          </tr>

          ${
            input.pieceCredentials.length > 0
              ? `
          <!-- PASSWORDS -->
          <tr>
            <td style="padding: 28px 24px 8px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_CARD_SOFT}; border:1px solid ${ACCENT_SOFT}; border-radius:12px;">
                <tr>
                  <td style="padding: 24px 22px 12px 22px;">
                    <div style="font-family: Arial, Helvetica, sans-serif; color:${ACCENT}; font-size:18px; font-weight:800; margin:0 0 6px 0; letter-spacing:0.01em;">
                      ${escapeHtml(accessHeading)}
                    </div>
                    <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:13px; line-height:1.5; margin:0 0 16px 0;">
                      ${escapeHtml(accessIntro)}
                    </div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr style="background:${ACCENT};">
                        <th align="left" style="padding: 10px 16px; font-family: Arial, Helvetica, sans-serif; color:#ffffff; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border-top-left-radius:6px;">
                          ${escapeHtml(passwordColumnPiece)}
                        </th>
                        <th align="right" style="padding: 10px 16px; font-family: Arial, Helvetica, sans-serif; color:#ffffff; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border-top-right-radius:6px;">
                          ${escapeHtml(passwordColumnPassword)}
                        </th>
                      </tr>
                      ${pieceRows}
                    </table>
                    <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:12px; line-height:1.5; margin: 16px 0 0 0; font-style:italic;">
                      ${escapeHtml(emailSafeReminder)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- NOTES -->
          <tr>
            <td style="padding: 28px 32px 8px 32px;">
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT}; font-size:14px; line-height:1.6; text-align:center; margin:0 0 12px 0;">
                ${escapeHtml(trackingNotice)}
              </div>
              <div style="font-family: Georgia, 'Times New Roman', serif; color:${TEXT_MUTED}; font-size:13px; font-style:italic; line-height:1.6; text-align:center; margin: 18px auto 0 auto; max-width:480px;">
                ${escapeHtml(artHistoryNote)}
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 32px 24px 32px 24px;" align="center">
              <div style="height:1px; background:rgba(255,255,255,0.08); margin:0 0 18px 0;"></div>
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:12px; letter-spacing:0.06em;">
                I LAUGH YOU &mdash; ${escapeHtml(footerTagline)}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.buyerEmail,
    subject,
    html,
  });

  if (error) {
    console.error("[Resend] Failed to send purchase confirmation:", error);
  }

  // Suppress unused-variable warning for safeName (reserved for future salutation)
  void safeName;
}

// -------------------- SHIPPING NOTIFICATION --------------------
export async function sendShippingNotification(input: {
  buyerEmail: string;
  buyerName: string;
  orderId: number;
  imageId: number;
  trackingUrl: string | null;
  trackingNumber: string | null;
  locale?: string;
}) {
  // TODO: Once an `orders.locale` column is added via migration, the Printful
  // webhook will pass the real buyer locale. Until then, we default to "en".
  const locale = input.locale ?? "en";

  const subject = tEmail(locale, "shipping.subject", { imageId: input.imageId });
  const heroTitle = tEmail(locale, "shipping.heroTitle", { name: input.buyerName });
  const heroSubtitle = tEmail(locale, "shipping.heroSubtitle");
  const intro = tEmail(locale, "shipping.intro", {
    imageId: input.imageId,
    orderId: input.orderId,
  });
  const trackHeading = tEmail(locale, "shipping.trackHeading");
  const trackButton = tEmail(locale, "shipping.trackButton");
  const trackingNumberLabel = tEmail(locale, "shipping.trackingNumberLabel");
  const trackingPending = tEmail(locale, "shipping.trackingPending");
  const closing = tEmail(locale, "shipping.closing");
  const footerTagline = tEmail(locale, "footerTagline");

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:${BG_PAGE}; font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_PAGE};">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px; background:${BG_CARD};">

          <!-- HERO -->
          <tr>
            <td style="background:${HERO_GRADIENT}; padding: 44px 32px 40px 32px;" align="center">
              <div style="font-family: Arial, Helvetica, sans-serif; color:#ffffff; font-size:30px; line-height:1.15; font-weight:800; letter-spacing:-0.01em;">
                ${escapeHtml(heroTitle)}
              </div>
              <div style="display:inline-block; width:80px; height:4px; background:#ffffff; border-radius:2px; margin:16px 0 14px 0;"></div>
              <div style="font-family: Arial, Helvetica, sans-serif; color:rgba(255,255,255,0.92); font-size:15px; line-height:1.5; max-width:480px; margin:0 auto;">
                ${escapeHtml(heroSubtitle)}
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_LIGHT}; font-size:15px; line-height:1.6; text-align:center;">
                ${escapeHtml(intro)}
              </div>
            </td>
          </tr>

          ${
            input.trackingUrl
              ? `
          <tr>
            <td style="padding: 8px 32px 16px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_CARD_SOFT}; border-radius:10px;">
                <tr>
                  <td align="center" style="padding: 24px 22px;">
                    <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 14px 0;">
                      ${escapeHtml(trackHeading)}
                    </div>
                    <a href="${escapeHtml(input.trackingUrl)}" style="display:inline-block; padding:14px 32px; background:${ACCENT}; color:#ffffff; text-decoration:none; border-radius:8px; font-family: Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; letter-spacing:0.04em;">
                      ${escapeHtml(trackButton)}
                    </a>
                    ${
                      input.trackingNumber
                        ? `<div style="margin-top:14px; font-family: 'Courier New', Courier, monospace; color:${TEXT_MUTED}; font-size:13px;">${escapeHtml(trackingNumberLabel)}: <span style="color:${TEXT_LIGHT};">${escapeHtml(input.trackingNumber)}</span></div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 8px 32px 16px 32px;">
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:14px; text-align:center; font-style:italic;">
                ${escapeHtml(trackingPending)}
              </div>
            </td>
          </tr>
          `
          }

          <!-- CLOSING -->
          <tr>
            <td style="padding: 18px 32px 8px 32px;">
              <div style="font-family: Georgia, 'Times New Roman', serif; color:${TEXT_MUTED}; font-size:13px; font-style:italic; line-height:1.6; text-align:center; margin: 6px auto 0 auto; max-width:480px;">
                ${escapeHtml(closing)}
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 28px 24px 32px 24px;" align="center">
              <div style="height:1px; background:rgba(255,255,255,0.08); margin:0 0 18px 0;"></div>
              <div style="font-family: Arial, Helvetica, sans-serif; color:${TEXT_MUTED}; font-size:12px; letter-spacing:0.06em;">
                I LAUGH YOU &mdash; ${escapeHtml(footerTagline)}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.buyerEmail,
    subject,
    html,
  });

  if (error) {
    console.error("[Resend] Failed to send shipping notification:", error);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
