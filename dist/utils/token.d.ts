import crypto from "crypto";
export declare function generateRawToken(bytes?: number): string;
export declare function hashToken(raw: crypto.BinaryLike): Promise<string>;
export declare function verifyToken(raw: crypto.BinaryLike, hash: string): Promise<boolean>;
//# sourceMappingURL=token.d.ts.map