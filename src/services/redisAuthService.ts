import redis from './redis.ts'

// Method to create a key for a new reset session assigned for a user
export const createResetSession = async (userId: string | number | Buffer<ArrayBufferLike>, token: any) => {
    const key = `password_reset_session:${token}`;
    return redis.set(key, userId, 'EX', 900);
};

// Method to get a users ID from their reset session key
export const getUserIdByResetToken = async (token: any) => {
    return redis.get(`password_reset_session:${token}`);
};

// Method to delete a users reset session key
export const invalidateResetSession = async (token: any) => {
    return redis.del(`password_reset_session:${token}`);
};

