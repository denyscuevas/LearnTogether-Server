import crypto from "crypto";
// Generating a 32-byte token to be used for refresh tokens and other sensitive tokens
export function generateRawToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex");
}
// Hashing the token so the raw token is not stored in the database
export async function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}
// Verifying a raw token matches the stored hash
export async function verifyToken(raw, hash) {
    return crypto.createHash("sha256").update(raw).digest("hex") === hash;
}
//# sourceMappingURL=token.js.map