import { Resend } from "resend";

// If RESEND_API_KEY is not set, email sending is skipped (dev/local mode).
// Set it in Railway Variables to enable verification emails in production.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping verification email to ${to}`);
    console.log(`[email] Verify URL: ${process.env.AUTH_URL}/auth/verify/${token}`);
    return;
  }

  const verifyUrl = `${process.env.AUTH_URL}/auth/verify/${token}`;

  await resend.emails.send({
    from: "AgentStack <noreply@agentstack.catalystedgeconnect.com>",
    to,
    subject: "Verify your AgentStack account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #09090b; color: #e4e4e7; border-radius: 12px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Verify your email</h1>
        <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Click the link below to verify your email address and activate your AgentStack account.
          This link expires in 24 hours.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #fff; color: #09090b; font-weight: 700;
                  font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
          Verify email →
        </a>
        <p style="color: #52525b; font-size: 12px; margin-top: 24px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
