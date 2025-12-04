import crypto from "crypto";
export declare function generateOTP(): string;
export declare function hashOTP(otp: crypto.BinaryLike): Promise<string>;
export declare function verifyOTP(raw: crypto.BinaryLike, hash: string): Promise<boolean>;
//# sourceMappingURL=otp.d.ts.map