import Redis from 'ioredis';

// Using the public redis url
const redisURL = process.env.REDIS_PUBLIC_URL;

if (!redisURL) {
    throw new Error("REDIS_URL is missing");
}

// Establishing a Redis instance, with a maximum retires set to 4
const redis = new Redis(redisURL, {
    retryStrategy: (times) => {
        return Math.min(times * 200, 2000);
    },
});

// Testing the connections
redis.on('connect', () => console.log('Redis Connected'));
redis.on('error', (err) => console.error('Redis Error:', err));

export default redis;