import 'dotenv/config';
import crypto from 'crypto'

// Set encryption algorithm
const algorithm = 'aes-256-gcm'
// Store the message encryption key as a buffer
if (!process.env.MESSAGE_ENCRYPT_SECRET) throw new Error('MESSAGE_ENCRYPT_SECRET is not defined')
const key = Buffer.from(process.env.MESSAGE_ENCRYPT_SECRET!, 'hex')

const encrypt = (text: string, key: Buffer) => {
    // Generate a random initialization vector for the cipher
    const iv = crypto.randomBytes(12)
    // Create a cipher from the algo, key, and iv we created above
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    // Use a buffer to convert the text to bytes.
    const encryptedText = Buffer.concat([
        // Encrypt the passed text with the cipher
        cipher.update(Buffer.from(text, 'utf-8')),
        // Convert the encrypted bytes back to a string
        cipher.final()
    ])

    // Generate an authentication tag to ensure the authenticity of the cipher
    const authTag = cipher.getAuthTag()

    return {
        cipherText: encryptedText,
        iv: iv,
        authTag: authTag
    }
}

const decrypt = (cipherText: Buffer, key: Buffer, iv: Buffer, authTag: Buffer) => {
    // Create a decipher from the algo, key, and iv we created above
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    // Use a buffer to convert the text to bytes.
    const decryptedText =  Buffer.concat([
        // decrypt the passed text with the deciphered
        decipher.update(cipherText),
        // Convert the decrypted bytes back to a string
        decipher.final()
    ])

    return decryptedText
}


const testCrypt = async (text: string) => {
    console.log("Plain text: ", text)
    const encrypted = encrypt(text, key)
    console.log(encrypted)
    const {cipherText, iv, authTag} = encrypted
    const decrypted = decrypt(cipherText, key, iv, authTag)
    console.log(decrypted.toString())
}


testCrypt("HEllo")