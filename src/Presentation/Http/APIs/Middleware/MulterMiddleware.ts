import multer from "multer";
import { Request, Response, NextFunction } from 'express';
// Define the extended Request type for Multer
interface MulterRequest extends Request {
    file?: Express.Multer.File;
    files?: {
        [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
}

export enum ErrorCode {
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    UPLOAD_ERROR = 'UPLOAD_ERROR',
    INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
    NO_VALID_FILES = 'NO_VALID_FILES',
    TOO_MANY_FILES = 'TOO_MANY_FILES'
}

export enum UploadFileType {
    IMAGE = 'image',
    PDF = 'pdf',
    VIDEO = 'video',
    DOCUMENT = 'document'
}

export enum FieldName {
    FILE = 'file',
    FILES = 'files'
}

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, // 5MB limit per file
        files: 10 // Maximum number of files
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
});

// Helper to handle Multer errors
const handleMulterError = (err: any, res: Response) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds the 5MB limit',
                    errorCode: ErrorCode.FILE_TOO_LARGE
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum is 10 files',
                    errorCode: ErrorCode.TOO_MANY_FILES
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: err.message,
                    errorCode: ErrorCode.UPLOAD_ERROR
                });
        }
    }
    return res.status(400).json({
        success: false,
        message: 'Error uploading file(s)',
        errorCode: ErrorCode.UPLOAD_ERROR
    });
};

// Single file upload middleware
const uploadSingle = (fieldName: string = FieldName.FILE) => {
    return (req: MulterRequest, res: Response, next: NextFunction) => {
        const uploadSingle = upload.single(fieldName as string);
        
        uploadSingle(req, res, (err: any) => {
            if (err) {
                console.log("Multer error: ", err);
                return handleMulterError(err, res);
            }
            
            if (!req.file) {
                console.log("No file uploaded");
                return res.status(400).json({
                    success: false,
                    message: 'Invalid file type. Only JPEG and PNG images are allowed',
                    errorCode: ErrorCode.INVALID_FILE_TYPE
                });
            }

            console.log("File uploaded successfully!!!");
            
            next();
        });
    };
};

// Multiple files upload middleware
const uploadMultiple = (fieldName: string = FieldName.FILES, maxCount: number = 10) => {
    return (req: MulterRequest, res: Response, next: NextFunction) => {
        const uploadArray = upload.array(fieldName as string, maxCount);
        
        uploadArray(req, res, (err: any) => {
            if (err) {
                return handleMulterError(err, res);
            }
            
            if (!Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid files uploaded. Only JPEG and PNG images are allowed',
                    errorCode: ErrorCode.NO_VALID_FILES
                });
            }
            
            next();
        });
    };
};


const uploadFields = (fields: { name: string; maxCount: number }[]) => {
    return (req: MulterRequest, res: Response, next: NextFunction) => {
        const uploadFields = upload.fields(fields);
        
        uploadFields(req, res, (err: any) => {
            if (err) {
                return handleMulterError(err, res);
            }
            
            const hasFiles = fields.some(field => {
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                return files && files[field.name] && files[field.name].length > 0;
            });
            
            if (!hasFiles) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid files uploaded. Only JPEG and PNG images are allowed',
                    errorCode: ErrorCode.NO_VALID_FILES
                });
            }
            
            next();
        });
    };
};

export { uploadSingle, uploadMultiple, uploadFields };