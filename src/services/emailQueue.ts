import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { sendVerificationEmail } from "./mailer.ts";
import dotenv from 'dotenv'

dotenv.config()

if(!process.env.REDIS_PUBLIC_URL) {
    throw new Error('Redis URL is missing')
}

// Create a connection to the redis service
const connection = new IORedis(
    process.env.REDIS_PUBLIC_URL,
    {
        maxRetriesPerRequest: null,
        enableReadyCheck: true
    }
)

// Generate an email queue
export const emailQueue = new Queue("emails", { connection })

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
        }
    },
    { connection, concurrency: 10 }
);