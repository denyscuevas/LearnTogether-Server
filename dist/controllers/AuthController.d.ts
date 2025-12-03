import express from "express";
export declare const register: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const login: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const resendVerification: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const verifyEmail: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const requestPasswordReset: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const verifyResetOTP: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const resetPassword: (req: express.Request, res: express.Response) => Promise<express.Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=AuthController.d.ts.map