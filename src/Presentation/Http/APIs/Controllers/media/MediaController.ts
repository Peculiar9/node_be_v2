import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { controller, httpPost, httpDelete, httpGet } from 'inversify-express-utils';
import { BaseController } from '../BaseController';
import { TYPES } from '@Core/Types/Constants';
import { IMediaService, ImageTransformation } from '@Core/Application/Interface/Services/IMediaService';
import { AuthMiddleware } from '../../Middleware/AuthMiddleware';
import { uploadSingle, uploadMultiple, FieldName } from '../../Middleware/MulterMiddleware';

@controller('/api/v1/media')
export class MediaController extends BaseController {
    constructor(
        @inject(TYPES.MediaService) private readonly mediaService: IMediaService,
        @inject(TYPES.AuthMiddleware) private readonly authMiddleware: AuthMiddleware
    ) {
        super();
    }

    /**
     * Upload a single file
     * @route POST /api/v1/media/upload
     */
    @httpPost('/upload', uploadSingle(FieldName.FILE))
    async uploadFile(req: Request, res: Response) {
        try {
            const file = req.file;
            if (!file) {
                return this.error(res, 'No file provided', 400);
            }

            // Get folder from query params or use default
            const folder = req.query.folder as string || 'uploads';
            
            // Get public_id from query params if available
            const publicId = req.query.public_id as string;
            
            // Extract file type from mimetype
            const resourceType = file.mimetype.startsWith('image/') ? 'image' as const : 
                              file.mimetype.startsWith('video/') ? 'video' as const : 'raw' as const;
            
            const uploadOptions = {
                folder,
                publicId,
                resourceType
            };

            const result = await this.mediaService.uploadFile(file.buffer, uploadOptions);
            
            return this.success(res, {
                url: result.url,
                secureUrl: result.secureUrl,
                publicId: result.publicId,
                format: result.format,
                size: result.bytes,
                resourceType: result.resourceType
            }, 'File uploaded successfully');
        } catch (error: any) {
            console.error('Error uploading file:', error);
            return this.error(res, `Failed to upload file: ${error.message}`, 500, error);
        }
    }

    /**
     * Upload multiple files
     * @route POST /api/v1/media/upload/multiple
     */
    @httpPost('/upload/multiple', uploadMultiple(FieldName.FILES))
    async uploadMultipleFiles(req: Request, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return this.error(res, 'No files provided', 400);
            }

            // Get folder from query params or use default
            const folder = req.query.folder as string || 'uploads';
            
            // Process files one by one
            const uploadPromises = files.map(file => {
                return this.mediaService.uploadFile(file.buffer, {
                    folder,
                    resourceType: file.mimetype.startsWith('image/') ? 'image' as const : 
                                 file.mimetype.startsWith('video/') ? 'video' as const : 'raw' as const
                });
            });

            const results = await Promise.all(uploadPromises);
            
            const responseData = results.map(result => ({
                url: result.url,
                secureUrl: result.secureUrl,
                publicId: result.publicId,
                format: result.format,
                size: result.bytes,
                resourceType: result.resourceType
            }));

            return this.success(res, responseData, 'Files uploaded successfully');
        } catch (error: any) {
            console.error('Error uploading multiple files:', error);
            return this.error(res, `Failed to upload files: ${error.message}`, 500, error);
        }
    }

    /**
     * Delete a file by public ID
     * @route DELETE /api/v1/media/:publicId
     */
    @httpDelete('/:publicId')
    async deleteFile(req: Request, res: Response) {
        try {
            const { publicId } = req.params;
            if (!publicId) {
                return this.error(res, 'Public ID is required', 400);
            }

            const result = await this.mediaService.deleteFile(publicId);
            
            if (!result.success) {
                return this.error(res, result.message || 'Failed to delete file', result.statusCode || 400);
            }

            return this.success(res, result, 'File deleted successfully');
        } catch (error: any) {
            console.error('Error deleting file:', error);
            return this.error(res, `Failed to delete file: ${error.message}`, 500, error);
        }
    }

    /**
     * Get transformation URL for an image
     * @route GET /api/v1/media/transform/:publicId
     */
    @httpGet('/transform/:publicId')
    async getTransformedUrl(req: Request, res: Response) {
        try {
            const { publicId } = req.params;
            if (!publicId) {
                return this.error(res, 'Public ID is required', 400);
            }

            // Parse transformation options from query params
            const transformations: ImageTransformation = {
                width: req.query.width ? parseInt(req.query.width as string) : undefined,
                height: req.query.height ? parseInt(req.query.height as string) : undefined,
                crop: req.query.crop as "fill" | "scale" | "fit" | "thumb" | "crop" | undefined,
                gravity: req.query.gravity as "auto" | "face" | "center" | "north" | "south" | "east" | "west" | undefined,
                quality: req.query.quality ? parseInt(req.query.quality as string) : undefined,
                format: req.query.format as "auto" | "jpg" | "png" | "webp" | "gif" | undefined,
                effect: req.query.effect as string,
                angle: req.query.angle ? parseInt(req.query.angle as string) : undefined,
                radius: req.query.radius ? parseInt(req.query.radius as string) : undefined,
                background: req.query.background as string,
            };

            const url = await this.mediaService.getTransformedUrl(publicId, transformations);
            
            return this.success(res, { url }, 'Transformation URL generated successfully');
        } catch (error: any) {
            console.error('Error generating transformation URL:', error);
            return this.error(res, `Failed to generate transformation URL: ${error.message}`, 500, error);
        }
    }

    /**
     * Get file details by public ID
     * @route GET /api/v1/media/:publicId
     */
    @httpGet('/:publicId')
    async getFileDetails(req: Request, res: Response) {
        try {
            const { publicId } = req.params;
            if (!publicId) {
                return this.error(res, 'Public ID is required', 400);
            }

            const details = await this.mediaService.getFileDetails(publicId);
            
            return this.success(res, details, 'File details retrieved successfully');
        } catch (error: any) {
            console.error('Error retrieving file details:', error);
            return this.error(res, `Failed to retrieve file details: ${error.message}`, 500, error);
        }
    }
}
