import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary using the env variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
});

// Method which uploads the files to the given folder on Cloudinary, with the specified size and image constraints
export const uploadToCloudinary = (buffer: Buffer): Promise<any> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'learntogether_profile_pictures',
                transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
            },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};

// Method which breaks down the Cloudinary URL to get the public_id in order to delete an image after an image update
export const deleteFromCloudinary = async (imageUrl: string) => {
    try {
        const parts = imageUrl.split('/');
        const fileName = parts.pop() || "";
        const folder = parts.pop() || "";
        const publicId = `${folder}/${fileName.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
    }
};