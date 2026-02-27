import prisma from "../config/prismaClient.ts";
import bcrypt from 'bcrypt'
import crypto from "crypto"
import jwt from "jsonwebtoken";
import {validationResult, type ValidationError} from 'express-validator'
import express from "express";
import {generateRawToken, hashToken, verifyToken} from "../utils/token.ts";
import {addEmailJobToQueue} from "../services/emailQueue.ts";
import {generateOTP, hashOTP, verifyOTP} from "../utils/otp.ts";
import {sendVerificationEmail} from "../services/mailer.ts";
import {isExpired} from "../utils/isExpired.ts"
import {createResetSession, getUserIdByResetToken, invalidateResetSession} from "../services/redisAuthService.ts";
import redis from "../services/redis.ts";


// Register logic to create a new User
export const register = async (req: express.Request, res: express.Response) => {
    try {

        // Deconstruct the request payload and extract the credentials
        const {email, password, password_confirmation} = req.body;

        // Ensure that the required values have been provided
        if (!email || !password || !password_confirmation) {
            return res.status(400).json({
                message: "Missing email or password",
            });
        }

        // Check if the password and password_confirmation match
        if (password !== password_confirmation) {
            return res.status(400).json({
                message: "Passwords don't match",
            });
        }

        // Attempt to find an existing user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
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

        // Create a record of the password in the password history table for versioned credentials
        await prisma.passwordHistory.create({
            data: {
                userId: newUser.id,
                oldHash: passwordHash,
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
            user: newUser.id,
            otp: rawOTP // TODO REMOVE THIS LATER! ITS FOR TESTING
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
        // Deconstruct the request payload and extract the credentials
        const {email, password} = req.body;

        // Ensure that the required values have been provided
        if (!email || !password) {
            return res.status(400).json({
                message: "Missing email or password",
            })
        }

        // Attempt to find an existing user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
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
        if (!existingUser.isVerified) {
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
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/"
        });

        // Find the user's profile if it exists and add it to the response
        const profile = await prisma.profile.findFirst({
            where: {userId: existingUser.id}
        })

        // Returning the success response
        return res.status(200).json({
            message: 'User successfully logged in',
            token,
            user: {id: existingUser.id, email: existingUser.email},
            profile: profile
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

        // Deconstruct the request payload and get the email
        const {email} = req.body;

        // Check that an email was provided
        if (!email) {
            return res.status(400).json({
                message: "Missing email",
            })
        }

        // Look for a user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        });

        // If the user doesn't exist, this information is not explicitly leaked for security purposes
        if (!existingUser) {
            return res.status(400).json({
                message: "TEST If an account exists, a verification code has been sent", existingUser
            });
        }

        // If the user is already verified they wont get another verification email
        if (existingUser.isVerified) {
            return res.status(400).json({
                message: "Please continue to login",
            })
        }

        // Invalidate all existing email verification tokens for this user before sending a new one
        await prisma.emailVerificationToken.deleteMany({
            where: {
                userId: existingUser.id
            }
        });

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
            user: existingUser.id,
            otp: rawOtp // TODO REMOVE THIS LATER! ITS FOR TESTING
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

        // Deconstruct the request and get the provided OTP and the user's ID
        const {id, otpCode} = req.body;

        const errors = validationResult(req);
        // Ensure they have provided both values
        if (!id || !otpCode) {
            return res.status(400).json({
                errors: errors.array(),
            })
        }

        // Getting the userId, and looking for the most recent token generated for that user
        const userId = id;
        const record = await prisma.emailVerificationToken.findFirst({
            where: {
                userId, expiresAt:
                    {gt: new Date()}
            },
            orderBy: {createdAt: "desc"},
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
            });
        }

        // Use the token isExpired helper function to check if the token is expired
        if (isExpired(record.expiresAt)) {
            return res.status(400).json({
                message: "Expired token",
            });
        }

        // Update the user's verification status to true
        await prisma.user.update({
            where: {id: userId},
            data: {isVerified: true}
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

// Logic for requesting a password reset session
export const requestPasswordReset = async (req: express.Request, res: express.Response) => {
    try {

        const {email} = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Missing email",
            })
        }

        // Find user with matching email
        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        })

        // Send vague response if user doesn't exist to prevent leaking account existence
        if (!user) {
            return res.status(400).json({
                message: "If an account exists, a reset code has been sent"
            })
        }

        // Delete all previous password reset tokens before issuing a new one
        await prisma.passwordResetToken.deleteMany({
            where: {
                userId: user.id
            }
        });

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
            email: email,
            otp: rawOtp // TODO REMOVE THIS LATER! ITS FOR TESTING
        })
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

// Logic for verifying the OTP entry for  password reset
export const verifyResetOTP = async (req: express.Request, res: express.Response) => {
    try {
        const {email, otp} = req.body;

        // Return error if email or otp is missing
        if (!email || !otp) {
            return res.status(400).json({message: "Email and OTP are required!",})
        }

        // Find user with matching email
        const user = await prisma.user.findUnique({where: {email: email}});

        // If the user doesn't exist, return error
        if (!user) {
            return res.status(400).json({
                message: "Email or OTP is incorrect!"
            })
        }

        // If the user exists, find the most recent token associated with them
        const userId = user.id
        const token = await prisma.passwordResetToken.findFirst({
            where: {
                userId,
                expiresAt: {gt: new Date()},
            }, orderBy: {createdAt: "desc"}
        })

        // If token is not found, return error
        if (!token) {
            return res.status(400).json({message: "OTP was not found or expired"})
        }

        // Verify OTP with the token hash
        const isValid = await verifyOTP(otp, token.tokenHash);

        // If invalid, return error
        if (!isValid) {
            return res.status(400).json({message: "Invalid code"})
        }

        // Ensure the token is not expired
        if (isExpired(token.expiresAt)) {
            return res.status(400).json({
                message: "Expired token",
            })
        }

        // If the OTP is valid, delete all tokens associated with this user
        await prisma.passwordResetToken.deleteMany({
            where: {userId}
        })

        // Generate a reset token, add it to the user via Redis, which is valid for 15 minutes
        const passwordResetToken = crypto.randomBytes(32).toString('hex');
        await createResetSession(userId, passwordResetToken);

        // Send the reset token in a cookie, which is attached in the /reset-password endpoint
        res.cookie('password_reset_token', passwordResetToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
            path: "/api/auth/reset-password",
        });

        // Return success message
        return res.json({message: "OTP verified"})

    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

// Logic for actually resetting a users password
export const resetPassword = async (req: express.Request, res: express.Response) => {

    // Try to get the reset token from the cookie
    const resetToken = req.cookies.password_reset_token;
    if (!resetToken) {
        return res.status(401).json({
            message: "No active reset session. Please request another OTP.",
        })
    }
    try {
        // Destructure the request and print error messages if any values are missing
        const {password, password_confirmation} = req.body;
        if (!password || !password_confirmation) {
            return res.status(400).json({message: "Missing password or password confirmation!"})
        }

        // Getting the userId from the Redis key
        const userId = await getUserIdByResetToken(resetToken);
        if (!userId) {
            return res.status(401).json({
                message: "Reset session expired. Please request another OTP.",
            })
        }

        // Get user from the user id and sort their passwords by createdAt
        const user = await prisma.user.findUnique({
            where: {id: userId},
            include: {passwordHistory: {orderBy: {createdAt: "desc"}}}
        });
        // Return error if user is not found
        if (!user) {
            return res.status(400).json({message: "User not found!"})
        }

        // Get the user's last 5 passwords
        const passwordHistory = user.passwordHistory.slice(0, 5);

        // check if any passwords in the history match the new password
        const results = await Promise.all(
            passwordHistory.map(entry => bcrypt.compare(password, entry.oldHash))
        )

        // Return error if any passwords match
        if (results.includes(true)) {
            return res.status(400).json({message: "Password cannot be the same as any of your previous passwords!"})
        }

        // Return error if password and password confirmation do not match
        if (password !== password_confirmation) {
            return res.status(400).json({message: "Passwords do not match!"})
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(password, 10);

        // Use transaction to do multiple database operations at once
        await prisma.$transaction(async (tx) => {
            // Update the user's password with the new password
            await tx.user.update({
                where: {id: userId},
                data: {passwordHash}
            })

            // Add new password to the user's password history
            await tx.passwordHistory.create({
                data: {userId, oldHash: passwordHash}
            })

            // Find all previous passwords by the user and sort by createdAt
            const previousPasswords = await tx.passwordHistory.findMany({
                where: {userId},
                orderBy: {createdAt: "desc"}
            })

            // Check if the user has more than 5 passwords in their history
            if (previousPasswords.length > 5) {
                // Delete the oldest passwords up to the 5th password
                const oldestPassword = previousPasswords.slice(5)
                await tx.passwordHistory.deleteMany({
                    where: {id: {in: oldestPassword.map((old) => old.id)}}
                })
            }

            // Clearing the Redis key for this reset session, and clearing the cookie
            await invalidateResetSession(resetToken);
            res.clearCookie('password_reset_token',
                {
                    path: "/api/auth/reset-password",
                });

            // Return success message
            return res.status(200).json({message: "Password reset successfully!"})
        })
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error
        })
    }
}

// Logic for getting a new access token using a valid refresh token
export const refreshToken = async (req: express.Request, res: express.Response) => {

    // Get the existing raw refresh token from the cookie in the header
    const existingToken = req.cookies.refreshToken;
    if (!existingToken) {
        return res.status(401).json({
            message: "No refresh token found"
        })
    }

    try {

        // Get all the refresh tokens that are not expired
        const validTokens = await prisma.refreshToken.findMany({
            where: {
                expiresAt: {gt: new Date()},
                revokedAt: null
            }
        });

        // Look for the token that matches the hash of the raw token that came in the header
        let usersToken = null;
        for (const token of validTokens) {
            const isUsersToken = await bcrypt.compare(existingToken, token.tokenHash);

            if (isUsersToken) {
                usersToken = token;
                break;
            }
        }

        // If there was no result then a valid refresh doesn't exist
        if (!usersToken) {
            return res.status(401).json({
                message: "Invalid refresh token"
            })
        }

        // Delete all the refresh tokens for this user
        await prisma.refreshToken.deleteMany({
            where: {
                userId: usersToken.userId,
            }
        });

        // Get the user this refresh token is associated with
        const user = await prisma.user.findUnique({
            where: {id: usersToken.userId}
        })
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        // Ensuring a JWT_SECRET is available
        if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
            throw Error('JWT_SECRET is not defined');
        }

        // Generate a new JWT access token and sign it to the user
        const newAccessToken = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {expiresIn: "5m"}
        );

        // Generate a refresh token using secure, random utility functions
        const newRefreshToken = generateRawToken();
        const newSalt = await bcrypt.genSalt(10);
        const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, newSalt);

        // Store the new hashed refresh token in the database
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: newHashedRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        // Send the raw refresh token in a cookie again, which is valid for 7 days
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Send the access token back in the response
        return res.status(200).json(
            {token: newAccessToken}
        );
    } catch (error) {
        return res.status(403).json({
            message: "Refresh error",
            error: error
        })
    }
}

// Logic to logout a user
export const logout = async (req: express.Request, res: express.Response) => {

    // Get the refresh token from the cookie in the header
    const existingToken = req.cookies.refreshToken;

    try {

        if (existingToken) {

            // Look for all valid tokens
            const userTokens = await prisma.refreshToken.findMany({
                where: {
                    expiresAt: {gt: new Date()},
                    revokedAt: null
                }
            });

            // Find the token that matches the hash of the raw token in the header
            let tokenToRemove = null;
            for (const token of userTokens) {
                const isUsersToken = await bcrypt.compare(existingToken, token.tokenHash);

                if (isUsersToken) {
                    tokenToRemove = token;
                }
            }

            // Delete all refresh tokens for this user
            if (tokenToRemove) {
                await prisma.refreshToken.deleteMany({
                    where: {
                        userId: tokenToRemove.userId,
                    }
                });
            }
        }

        // Clear the cookie as well
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
        });

        return res.status(200).json({
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({
            error: 'Error during logout'
        });
    }
}
