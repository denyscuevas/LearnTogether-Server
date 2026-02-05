// Interface to hold message data
import prisma from "../config/prismaClient.ts";
import crypto from 'node:crypto';

interface Message {
    threadId: string;
    senderId: string;
    content: string;
}

// Create a new message in the database
export const createMessage = async (data: Message) => {
    const {threadId, senderId, content} = data

    // Check if all required fields are provided
    if (!threadId || !senderId || !content) {
        throw new Error("Invalid message data")
    }

    const {cipherText, iv, authTag} = encrypt(content, key)

    // Create a new message and return
    const message = prisma.message.create({
        data: {
            threadId,
            senderId,
            content: cipherText,
            iv,
            authTag
        }, include: {sender: {select: {profile: true}}}
    });

    // Decrypt message content
    const decryptedContent = decrypt(cipherText, key, iv, authTag)

    // Return message object with its content decrypted
    return message.then(message => ({...message, content: decryptedContent}));
}


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
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    // Use a buffer to convert the text to bytes.
    const encryptedText = Buffer.concat([
        // Encrypt the passed text with the cipher
        cipher.update(Buffer.from(text, 'base64')),
        cipher.final()
    ])

    // Generate an authentication tag to ensure the authenticity of the cipher
    const authTag = cipher.getAuthTag().toString('base64')

    // Return the encrypted text, iv, and authTag as strings
    return {
        cipherText: encryptedText.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag
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
        const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer)

        // Check authenticity
        decipher.setAuthTag(authTagBuffer)

        // Use a buffer to convert the text to bytes.
        const decryptedText = Buffer.concat([
            // decrypt the passed text with the deciphered
            decipher.update(Buffer.from(cipherText, 'base64')),
            decipher.final()
        ])
        return decryptedText
    } catch (error) {
        console.log("Message authentication failed ", error)
    }
}
