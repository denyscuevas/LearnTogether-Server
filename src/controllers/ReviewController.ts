import express from "express";
import prisma from "../config/prismaClient.ts";
import redis from "../services/redis.ts";

export const createReview = async (req: express.Request, res: express.Response) => {
    try{
        const reviewerId = (req as any).user?.id;
        const { revieweeId, rating, comments, courseId } = req.body;

        if (!reviewerId || !revieweeId) {
            return res.status(400).json({
                message: "Reviwer and Reviewee IDs are required"
            });
        }

        if (reviewerId === revieweeId) {
            return res.status(400).json({
                message: "You cannot review yourself"
            });
        }

        // check if ratings are 1 - 5
        if (rating > 5 || rating < 1){
            return res.status(400).json({
                message: "Rating needs to be between 1 and 5"
            });
        }

        await prisma.review.create({
            data:{
                reviewee_id : revieweeId,
                reviewer_id : reviewerId,
                course_id : courseId,
                rating,
                comments
            }
        })

        return res.status(201).json({
            message: "Review created"
        });


    }
    catch (error) {
        console.error("Request Error:", error);
        return res.status(500).json({
            message: "Failed to send request", error
        });
    }
}

export const getReviews = async (req: express.Request, res: express.Response) => {
    
    try{

        const viewerId = (req as any).user?.id;
        const intendedId = req.params.userId || viewerId;

        if (!intendedId) {
            return res.status(400).json({
                message: "Missing ID"
            });
        }

        const reviews = await prisma.review.findMany({
            where:{
                reviewee_id : intendedId
            },
            include :{
                reviewer : {
                    select : {
                        name : true,
                        major: true
                    }
                }
            }
        })

        
        

        return res.status(200).json(reviews)


    }
    catch(error){
        return res.status(500).json({
            message : "Failed to send request", error
        })
    }
}