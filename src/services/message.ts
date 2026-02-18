// Interface to hold message data
import prisma from "../config/prismaClient.ts";
import crypto from 'node:crypto';

export interface Message {
    threadId: string;
    senderId: string;
    content: string;
}

// Create a new message in the database
export const createMessage = async (data: Message, tx?:  any) => {
    const {threadId, senderId, content} = data
    const prismaClient = tx || prisma;

    // Check if all required fields are provided
    if (!threadId || !senderId || !content) {
        throw new Error("Invalid message data")
    }

    const {cipherText, iv, authTag} = encrypt(content, key)

    // Create a new message and return
    const message = await prismaClient.message.create({
        data: {
            threadId: threadId,
            senderId: senderId,
            content: cipherText,
            iv: iv,
            authTag: authTag
        }, include: {sender: {select: {profile: true}}}
    });

    // Return message object with its content decrypted
    return {
        ...message,
        content: decrypt(message.content, key, message.iv, message.authTag)
    };}


// Set encryption algorithm
const algorithm = 'aes-256-gcm'
// Store the message encryption key
const key = process.env.MESSAGE_ENCRYPT_SECRET!

// Encrypt text using the AES-256-GCM cipher algorithm
const encrypt = (text: string, key: string) => {

    // Convert key from a string to a buffer
    const keyBuffer = Buffer.from(key!, 'hex')

    // Generate a random initialization vector for the cipher
    const iv = crypto.randomBytes(12)

    // Create a cipher from the algo, key, and iv we created above
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv)

    // Use a buffer to convert the text to bytes.
    const encryptedText = Buffer.concat([
        // Encrypt the passed text with the cipher
        cipher.update(Buffer.from(text, 'utf-8')),
        cipher.final()
    ])

    // Generate an authentication tag to ensure the authenticity of the cipher
    const authTag = cipher.getAuthTag()

    // Return the encrypted text, iv, and authTag as strings
    return {
        cipherText: encryptedText.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    }
}

// Decrypt text using the AES-256-GCM cipher algorithm
export const decrypt = (cipherText: string, key: string, iv: string, authTag: string) => {
    try {
        // Convert iv from a string to a buffer
        const ivBuffer = Buffer.from(iv, 'base64')

        // Convert authTag from a string to a buffer
        const authTagBuffer = Buffer.from(authTag, 'base64')

        // Convert key from a string to a buffer
        const keyBuffer = Buffer.from(key!, 'hex')

        // Create a decipher from the algo, key, and iv we created above
        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer)

        // Check authenticity
        decipher.setAuthTag(authTagBuffer)

        // Use a buffer to convert the text to bytes.
        const decryptedText = Buffer.concat([
            // decrypt the passed text with the deciphered
            decipher.update(Buffer.from(cipherText, 'base64')),
            decipher.final()
        ])

        // Return the decrypted text as a readable string
        return decryptedText.toString('utf-8')
    } catch (error) {
        console.log("Message authentication failed ", error)
    }
}
