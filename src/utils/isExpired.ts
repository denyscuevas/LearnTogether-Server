// Helper method to use for checking token validity with respect to expiration time
export function isExpired(expiresAt: Date) {
    return new Date() > expiresAt;
}