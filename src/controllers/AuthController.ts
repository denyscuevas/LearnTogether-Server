import prisma from "../config/prismaClient.ts";
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import { validationResult } from 'express-validator'
import express from "express";
import { generateRawToken, hashToken, verifyToken} from "../utils/token.ts";

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

        // Return the success response
        return res.status(201).json({
            message: "User created successfully",
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

        // Indicate the password doesn't;t match without leaking account existence or absence
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