import nodemailer from "nodemailer";
import dotenv from "dotenv";
import type { SentMessageInfo, Options } from "nodemailer/lib/smtp-transport";

dotenv.config();

let transporter: nodemailer.Transporter<SentMessageInfo, Options>;

/**
 * Get a reusable email transporter
 * Uses persistent Ethereal credentials from environment variables
 */
export function getTransporter() {
    if (transporter) return transporter;

    if (!process.env.ETHEREAL_USER || !process.env.ETHEREAL_PASSWORD) {
        throw new Error(
            "Missing ETHEREAL_USER or ETHEREAL_PASS in environment variables"
        );
    }

    transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: process.env.ETHEREAL_USER,
            pass: process.env.ETHEREAL_PASSWORD,
        },
    });

    return transporter;
}
