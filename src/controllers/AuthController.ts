import prisma from "../config/prismaClient.ts";
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import { validationResult } from 'express-validator'
import express from "express";

// Register logic to create a new User
export const register = async (req: express.Request, res: express.Response) => {

    try {

        // Check if their are any validation errors before continuing
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
            })
        }

        // Check if the password and password_confirmation match
        if(password !== password_confirmation) {
            return res.status(400).json({
                message: "Passwords don't match",
            })
        }

        // Attempt to find an existing user with this email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        // Indicate if an account with this email exists already
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            })
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
        })

        // Return the success response
        return res.status(201).json({
            message: "User created successfully",
            user: newUser.id
        })
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        })
    }
}