import { getTransporter } from "./transporter.ts";

export async function sendVerificationEmail(email: any, code: any, userId: any) {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
        from: '"LearnTogether" <learntogether@uwindsor.ca>',
        to: email,
        subject: "Verify your email",
        html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
        <h1>LearnTogether Email Verification Request</h1>
        <p>We received a request to verify your email for the LearnTogether platform: 
            ${email}. Your code is:</p>
        <h2 style="font-size:24px;margin:16px 0;color:#0f766e">${code}</h2>
        <p style="color:#6b7280;font-size:12px;margin-top:12px">
          For your security, this code will expire in 30 minutes.
        </p>
        <p style="color:#6b7280;font-size:12px;margin-top:12px">
          If you didn’t request this, you can ignore this email.
        </p>
      </div>
    `
    });

    console.log("Email sent! Preview URL: https://ethereal.email/messages");
    return info;
}

export async function sendPasswordResetEmail(email: any, code: any) {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
        from: '"LearnTogether" <learntogether@uwindsor.ca>',
        to: email,
        subject: "Your password reset code for LearnTogether",
        html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
        <h1>LearnTogether Password Reset Code</h1>
        <p>We received a request to reset your password for the LearnTogether platform: 
            ${email}. Your code is:</p>
        <h2 style="font-size:24px;margin:16px 0;color:#0f766e">${code}</h2>
        <p style="color:#6b7280;font-size:12px;margin-top:12px">
          For your security, this code will expire in 15 minutes.
        </p>
        <p style="color:#6b7280;font-size:12px;margin-top:12px">
          If you didn’t request this, you can ignore this email.
        </p>
      </div>
    `
    });

    console.log("Email sent! Preview URL: https://ethereal.email/messages");
    return info;
}
