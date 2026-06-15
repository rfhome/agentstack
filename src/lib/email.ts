import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.AUTH_EMAIL_FROM ?? "AgentStack <onboarding@resend.dev>";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping verification email to ${to}`);
    console.log(`[email] Verify URL: ${process.env.AUTH_URL}/auth/verify/${token}`);
    return;
  }

  const verifyUrl = `${process.env.AUTH_URL}/auth/verify/${token}`;

  await resend.emails.send({
    from: FROM,
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

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env.AUTH_URL}/auth/reset-password?token=${token}`;
  if (!resend) {
    console.log(`[email] Reset URL: ${resetUrl}`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your AgentStack password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #09090b; color: #e4e4e7; border-radius: 12px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Click the link below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #fff; color: #09090b; font-weight: 700;
                  font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
          Reset password →
        </a>
        <p style="color: #52525b; font-size: 12px; margin-top: 24px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendAdminNewUserEmail(adminEmail: string, userEmail: string, userName: string): Promise<void> {
  const adminUrl = `${process.env.AUTH_URL}/admin`;
  if (!resend) {
    console.log(`[email] New user pending approval: ${userEmail}`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New AgentStack signup — ${userEmail}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #09090b; color: #e4e4e7; border-radius: 12px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">New signup waiting for approval</h1>
        <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">
          <strong style="color: #e4e4e7;">${userName || "Unknown"}</strong> (${userEmail}) just signed up and is waiting for your approval.
        </p>
        <a href="${adminUrl}"
           style="display: inline-block; background: #fff; color: #09090b; font-weight: 700;
                  font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Review in Admin →
        </a>
      </div>
    `,
  });
}

export async function sendApprovalEmail(to: string, userName: string): Promise<void> {
  const signInUrl = `${process.env.AUTH_URL}/auth/signin`;
  if (!resend) {
    console.log(`[email] Approval notification to: ${to}`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your AgentStack account is approved",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #09090b; color: #e4e4e7; border-radius: 12px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">You're in!</h1>
        <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${userName || "there"}, your AgentStack account has been approved. Sign in to get started.
        </p>
        <a href="${signInUrl}"
           style="display: inline-block; background: #fff; color: #09090b; font-weight: 700;
                  font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
          Sign in →
        </a>
      </div>
    `,
  });
}
