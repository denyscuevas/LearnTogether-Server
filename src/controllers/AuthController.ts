import prisma from "../config/prismaClient.ts";
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import { validationResult } from 'express-validator'
import express from "express";