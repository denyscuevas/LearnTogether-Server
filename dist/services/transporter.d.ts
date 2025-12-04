import nodemailer from "nodemailer";
import type { SentMessageInfo, Options } from "nodemailer/lib/smtp-transport";
/**
 * Get a reusable email transporter
 * Uses persistent Ethereal credentials from environment variables
 */
export declare function getTransporter(): nodemailer.Transporter<SentMessageInfo, Options>;
//# sourceMappingURL=transporter.d.ts.map