import { Queue, Worker } from 'bullmq';
export declare const emailQueue: Queue<any, any, string, any, any, string>;
export declare function addEmailJobToQueue(email: any, code: any, userId: any, emailType: string): Promise<import("bullmq").Job<any, any, string>>;
export declare const emailWorker: Worker<any, any, string>;
//# sourceMappingURL=emailQueue.d.ts.map