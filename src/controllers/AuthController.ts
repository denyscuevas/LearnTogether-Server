import prisma from "../config/prismaClient.ts";
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import { validationResult } from 'express-validator'
import express from "express";
import { generateRawToken, hashToken, verifyToken} from "../utils/token.ts";
import {addEmailJobToQueue} from "../services/emailQueue.ts";
import {generateOTP, hashOTP, verifyOTP} from "../utils/otp.ts";
import {sendVerificationEmail} from "../services/mailer.ts";

// Register logic to create a new User
export const register = async (req: express.Request, res: express.Response) => {

    try {

        // Check if there are any validation errors before continuing
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        // Deconstruct the request payload and extract the credentials
        const { email, password, password_confirmation } = req.body;

        // Ensure that the required values have been provided
        if (!email || !password || !password_confirmation) {
            return res.status(400).json({
                message: "Missing email or password",
            });
        }

        // Check if the password and password_confirmation match
        if(password !== password_confirmation) {
            return res.status(400).json({
                message: "Passwords don't match",
            });
        }

        // Attempt to find an existing user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        // Indicate if an account with this email exists already
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        // Create the salt to hash the password and hash it
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create a User object with the given email and hashed password
        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash,
            }
        });

        const rawOTP = generateOTP();
        const otpHash = await hashOTP(rawOTP);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

        await prisma.emailVerificationToken.create({
            data: {
                userId: newUser.id,
                tokenHash: otpHash,
                expiresAt
            },
        });

        // Add the email request to the queue
        await addEmailJobToQueue(newUser.email, rawOTP, newUser.id, "sendVerificationEmail")

        // Return the success response
        return res.status(201).json({
            message: "User created successfully! Please check your inbox for a verification email.",
            user: newUser.id
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        });
    }
}

// Login logic to authenticate a User
export const login = async (req: express.Request, res: express.Response) => {

    try {

        // Check if there are any validation errors before continuing
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        // Deconstruct the request payload and extract the credentials
        const { email, password } = req.body;

        // Ensure that the required values have been provided
        if (!email || !password) {
            return res.status(400).json({
                message: "Missing email or password",
            })
        }

        // Attempt to find an existing user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        // If the user doesn't exist, this is not leaked for security reasons
        if (!existingUser) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }

        // Compare the entered plaintext password to the stored hashed password
        const passwordMatch = await bcrypt.compare(password, existingUser.passwordHash);

        // Indicate the password doesn't match without leaking account existence or absence
        if (!passwordMatch) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }

        // Indicate if the user is unverified and how they can do this before being allowed to login
        if(!existingUser.isVerified) {
            return res.status(400).json({
                message: "Please verify your email",
            })
        }

        // Ensuring a JWT_SECRET is available
        if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
            throw Error('JWT_SECRET is not defined');
        }

        // Generating a JWT token for short-term future authentication requests and signing it for the user
        const token = jwt.sign({
            id: existingUser.id,
            email: existingUser.email,
        }, process.env.JWT_SECRET, {
            expiresIn: '30m',
        });

        // Generate a refresh token using secure, random utility functions
        const refreshToken = generateRawToken();
        const salt = await bcrypt.genSalt(10);
        const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

        // Store the refresh token in the database (hashed), with a 7-day expiration
        await prisma.refreshToken.create({
            data: {
                userId: existingUser.id,
                tokenHash: hashedRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        // Forward the refresh token to the frontend in an HTTP Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Returning the success response
        return res.status(200).json({
            message: 'User successfully logged in',
            token,
            user: { id: existingUser.id, email: existingUser.email }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

// Logic to resend a verification link to a user
export const resendVerification = async (req: express.Request, res: express.Response) => {

    try {

        // Validate the request for any errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }

        // Deconstruct the request payload and get the email
        const { email } = req.body;

        // Check that an email was provided
        if (!email) {
            return res.status(400).json({
                message: "Missing email",
            })
        }

        // Look for a user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        });

        // If the user doesn't exist, this information is not explicitly leaked for security purposes
        if (!existingUser) {
            return res.status(400).json({
                message: "If an account exists, a verification code has been sent"
            });
        }

        // If the user is already verified they wont get another verification email
        if (existingUser.isVerified) {
            return res.status(400).json({
                message: "Please continue to login",
            })
        }

        // Generating the OTP, hashing it, and creating a 30-minute TTL
        const rawOtp = generateOTP();
        const otpHash = await hashOTP(rawOtp);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Adding the verification token to the email verification token table
        await prisma.emailVerificationToken.create({
            data: {
                userId: existingUser.id,
                tokenHash: otpHash,
                expiresAt
            }
        });

        // Adding the email send into the background queue
        await addEmailJobToQueue(email, rawOtp, existingUser.id, "sendVerificationEmail");

        // Return the success response
        return res.status(201).json({
            message: "If an account exists, a verification code has been sent",
            user: existingUser.id
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

// Logic to verify a users email based on OTP entry logic
export const verifyEmail = async (req: express.Request, res: express.Response) => {

    try {

        // Validate any errors in the request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }

        // Deconstruct the request and get the provided OTP and the user's ID
        const { id, otpCode } = req.body;

        // Ensure they have provided both values
        if (!id || !otpCode) {
            return res.status(400).json({
                errors: errors.array(),
            })
        }

        // Getting the userId, and looking for the most recent token generated for that user
        const userId = id;
        const record = await prisma.emailVerificationToken.findFirst({
            where: { userId, expiresAt:
                    { gt: new Date() } },
            orderBy: { createdAt: "desc" },
        });

        // If the token is not found indicate as such
        if (!record) {
            return res.status(400).json({
                message: "Token not found or expired",
            });
        }

        // Check if the token matches the hashed one
        const validToken = await verifyOTP(otpCode, record.tokenHash);
        if (!validToken) {
            return res.status(400).json({
                message: "Invalid token",
            })
        }

        // Update the user's verification status to true
        await prisma.user.update({
            where: {id: userId},
            data: { isVerified: true }
        });

        // Delete any verification token associated with this user
        await prisma.emailVerificationToken.deleteMany({
            where: {
                userId
            }
        });

        // Return the response message
        return res.status(200).json({
            message: "User successfully verified",
        })
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

// // Check if the request has any validation errors and display them in the response
// // Return a boolean and the error array to notify if there are any errors
// export const checkRequestErrors = (req: express.Request, res: express.Response): { boolean: boolean, errors: ValidationError[] } => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         res.status(400).json({
//             errors: errors.array()
//         })
//         return {boolean: true, errors: errors.array()}
//     }
//     return {boolean: false, errors: errors.array()}
// }

export const requestPasswordReset = async (req: express.Request, res: express.Response) => {
    try {

        // Validate any errors in the request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Missing email",
            })
        }

        // Find user with matching email
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        // Send vague response if user doesn't exist to prevent leaking account existence
        if (!user) {
            return res.status(400).json({
                message: "If an account exists, a reset code has been sent"
            })
        }

        // Generate OTP, hash it, and create a 15 minute TTL
        const rawOtp = generateOTP();
        const otpHash = await hashOTP(rawOtp);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Store token in the table
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: otpHash,
                expiresAt
            }
        })

        // Send email to specified email address with a reset code
        await addEmailJobToQueue(email, rawOtp, user.id, "sendPasswordResetEmail");

        return res.status(201).json({
            message: "If an account exists, a reset code has been sent",
        })
    }catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

