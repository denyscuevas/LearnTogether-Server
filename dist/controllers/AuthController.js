import prisma from "../config/prismaClient.ts";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { validationResult } from 'express-validator';
import express from "express";
export const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                message: "Missing name",
            });
        }
        const existingTest = await prisma.test.findFirst({
            where: {
                name
            }
        });
        if (existingTest) {
            return res.status(400).json({
                message: "Name already exists",
            });
        }
        const newTest = await prisma.test.create({
            data: {
                name
            }
        });
        // Return the success response
        return res.status(201).json({
            message: 'Name Added!',
            user: { name: newTest.name },
        });
    }
    catch (error) {
        return res.status(500).json({
            message: 'Something went wrong',
            error: error
        });
    }
};
//# sourceMappingURL=AuthController.js.map