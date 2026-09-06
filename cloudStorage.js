const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter (accept images only)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP, etc.) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }
}

/**
 * Cloud Storage Upload Handler
 * Saves image locally and optionally uploads to Cloud storage if configured
 */
async function processImageUpload(file) {
    if (!file) return null;
    
    // Default relative URL path for local development
    let finalUrl = `uploads/${file.filename}`;

    // Cloud storage integration hook (Cloudinary)
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
        try {
            console.log('☁️ Uploading image to Cloudinary storage provider...');
            const filePath = path.join(uploadsDir, file.filename);
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'ananyamlives_products'
            });
            if (result && result.secure_url) {
                finalUrl = result.secure_url;
                console.log('✅ Cloudinary upload success:', finalUrl);
            }
        } catch (e) {
            console.warn('⚠️ Cloudinary upload failed, falling back to local file URL:', e.message);
        }
    }

    return {
        filename: file.filename,
        url: finalUrl,
        size: file.size,
        mimetype: file.mimetype
    };
}

module.exports = {
    upload,
    processImageUpload,
    uploadsDir
};
