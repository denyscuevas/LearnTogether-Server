import crypto from "crypto";

// Generating a 32-byte token to be used for refresh tokens and other sensitive tokens
export function generateRawToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex")
}

// Hashing the token so the raw token is not stored in the database
export async function hashToken(raw: crypto.BinaryLike) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

// Verifying a raw token matches the stored hash
export async function verifyToken(raw: crypto.BinaryLike, hash: string) {
    return crypto.createHash("sha256").update(raw).digest("hex") === hash;
}