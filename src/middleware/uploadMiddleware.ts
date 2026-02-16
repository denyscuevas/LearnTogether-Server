import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

// Filtering the files to that they are only images of approved extensions
const fileFilter = (_req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only images (.jpg, .jpeg, .png, .webp) are allowed'));
};

// Limiting the files uploads to 2MB, and applying the file filter as well to the ruleset
export const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter
});