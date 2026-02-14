import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import {sendPasswordResetEmail, sendVerificationEmail} from "./mailer.ts";
import dotenv from 'dotenv'
import redis from "./redis.ts";

dotenv.config()

// Generate an email queue
export const emailQueue = new Queue("emails", { connection: redis })

// Add an email job to the queue
export function addEmailJobToQueue(email: any, code: any, userId: any, emailType: string) {
    const job = emailQueue.add(emailType, {email, code, userId})
    console.log(`Added job for userId=${userId}, email=${email}`);
    return job;
}

// Defining a worker that processes requests in the queue
export const emailWorker = new Worker(
    "emails",
    async (job) => {
        console.log(`Processing job ${job.id} for userId=${job.data.userId}`);
        if (job.name === "sendVerificationEmail") {
            const { email, code, userId } = job.data;
            await sendVerificationEmail(email, code, userId);
            console.log(`Email sent for userId=${userId}, email=${email}`);
        } else if (job.name === "sendPasswordResetEmail"){
            const { email, code, userId } = job.data;
            await sendPasswordResetEmail(email, code);
            console.log(`Email sent for userId=${userId}, email=${email}`);
        }
    },
    { connection: redis, concurrency: 10 }
);