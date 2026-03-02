import { Resend } from "resend";

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

export async function sendPurchaseConfirmation(input: {
  buyerEmail: string;
  buyerName: string;
  imageIds: number[];
  totalAmount: string;
  currency: string;
  orderId: number;
}) {
  const pieceList = input.imageIds
    .map((id) => `  - Piece #${id}`)
    .join("\n");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.buyerEmail,
    subject: `Your I LAUGH YOU order #${input.orderId} is confirmed!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #ff0069;">Thank you, ${escapeHtml(input.buyerName)}!</h1>
        <p>Your purchase has been confirmed. Here's your order summary:</p>

        <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order #${input.orderId}</strong></p>
          <p><strong>Pieces purchased:</strong></p>
          <ul>
            ${input.imageIds.map((id) => `<li>Piece #${id}</li>`).join("")}
          </ul>
          <p style="font-size: 1.2em; font-weight: bold;">
            Total: ${escapeHtml(input.totalAmount)} ${escapeHtml(input.currency)}
          </p>
        </div>

        <p>Each piece will be printed as an <strong>Enhanced Matte Paper Framed Poster (12"×16")</strong> and shipped to your address.</p>

        <p>You'll receive tracking information once your order ships.</p>

        <p style="margin-top: 30px; color: #666;">
          Each piece is a unique fragment of the world's largest self-portrait.<br/>
          You now own a piece of art history.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 0.85em; color: #999;">
          I LAUGH YOU — Made with love and laughter in Switzerland
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[Resend] Failed to send purchase confirmation:", error);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
