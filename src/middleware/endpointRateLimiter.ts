import {ipKeyGenerator, rateLimit} from 'express-rate-limit';
import {RedisStore} from 'rate-limit-redis';
import redis from "../services/redis.ts";

// Store whether the environment is in development or not
const isDevEnvironment = process.env.NODE_ENV !== 'prod';

// This is the ip limiting middleware, which defines a maximum window of requests for any given ip-email combo
export const limiter = (window: number, maxRequest: number, message: string) => {
    // Bypass the limiter in development
    if (isDevEnvironment) return (req: any, res: any, next: any) => next();

    return rateLimit({
        windowMs: window,
        limit: maxRequest,
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
            // @ts-expect-error
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: 'rate_limit:ip:',
        }),

        // Using the ipKeyGenerator method to prevent ipv6 workarounds, as there can be multiple addresses compared to ipv4
        keyGenerator: (req: any, res: any) => {
            const userEmail = req.body?.email || 'Undefined';
            const groupedIP = ipKeyGenerator(req, res);

            return `${groupedIP}-${userEmail}`;
        },
        message: { error: message },
    });
};