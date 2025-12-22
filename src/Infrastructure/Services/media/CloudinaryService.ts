import { injectable, inject } from 'inversify';
// @ts-ignore
import cloudinary from 'cloudinary';
import { TYPES } from '../../../Core/Types/Constants';
import { 
    IMediaService, 
    MediaUploadOptions, 
    MediaUploadResult, 
    MediaDeletionResult, 
    ImageTransformation,
    MediaFileDetails
} from '../../../Core/Application/Interface/Services/IMediaService';
import { ValidationError } from '../../../Core/Application/Error/AppError';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

/**
 * Media service implementation using Cloudinary
 */
@injectable()
export class CloudinaryService implements IMediaService {
    private readonly cloudinary: any;

    constructor(
        @inject(TYPES.CLOUDINARY_CLOUD_NAME) private readonly cloudName: string,
        @inject(TYPES.CLOUDINARY_API_KEY) private readonly apiKey: string,
        @inject(TYPES.CLOUDINARY_API_SECRET) private readonly apiSecret: string
    ) {
        // Configure Cloudinary
        this.cloudinary = cloudinary.v2;
        this.cloudinary.config({
            cloud_name: this.cloudName,
            api_key: this.apiKey,
            api_secret: this.apiSecret,
            secure: true // Use HTTPS
        });
    }

    /**
     * Upload a file to Cloudinary
     * @param file File buffer or path to upload
     * @param options Upload options
     * @returns Upload result with URL and metadata
     */
    async uploadFile(file: Buffer | string, options?: MediaUploadOptions): Promise<MediaUploadResult> {
        try {
            console.info('Uploading file to Cloudinary');
            
            // Prepare upload options
            const uploadOptions: any = {
                resource_type: options?.resourceType || 'auto',
                folder: options?.folder || 'uploads',
                tags: options?.tags || [],
                use_filename: true,
                unique_filename: true
            };

            // Add public_id if provided
            if (options?.publicId) {
                uploadOptions.public_id = options.publicId;
            }

            // Add access control if provided
            if (options?.accessControl) {
                uploadOptions.access_control = options.accessControl;
            }

            // Add transformation if provided
            if (options?.transformation) {
                uploadOptions.transformation = this.formatTransformation(options.transformation);
            }

            // Add metadata if provided
            if (options?.metadata) {
                uploadOptions.metadata = options.metadata;
            }

            // Handle file upload based on type
            let uploadResult;
            
            if (Buffer.isBuffer(file)) {
                // Create a temporary file for the buffer
                const tempFilePath = await this.createTempFileFromBuffer(file);
                try {
                    uploadResult = await this.cloudinary.uploader.upload(tempFilePath, uploadOptions);
                } finally {
                    // Clean up temporary file
                    await this.deleteTempFile(tempFilePath);
                }
            } else if (typeof file === 'string') {
                // Check if it's a local file path or a remote URL
                if (file.startsWith('http://') || file.startsWith('https://')) {
                    uploadOptions.fetch_format = 'auto';
                    uploadResult = await this.cloudinary.uploader.upload(file, uploadOptions);
                } else {
                    // Local file path
                    uploadResult = await this.cloudinary.uploader.upload(file, uploadOptions);
                }
            } else {
                throw new ValidationError('Invalid file format. Expected Buffer or string.');
            }

            console.info(`File uploaded successfully to Cloudinary: ${uploadResult.public_id}`);
            
            // Map Cloudinary result to our interface
            return this.mapCloudinaryResultToMediaUploadResult(uploadResult);
        } catch (error: any) {
            console.error('Failed to upload file to Cloudinary:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    /**
     * Upload multiple files to Cloudinary
     * @param files Array of file buffers or paths to upload
     * @param options Upload options
     * @returns Array of upload results
     */
    async uploadMultipleFiles(files: (Buffer | string)[], options?: MediaUploadOptions): Promise<MediaUploadResult[]> {
        try {
            console.info(`Uploading ${files.length} files to Cloudinary`);
            
            const uploadPromises = files.map(file => this.uploadFile(file, options));
            return await Promise.all(uploadPromises);
        } catch (error: any) {
            console.error('Failed to upload multiple files to Cloudinary:', error);
            throw new Error(`Failed to upload multiple files: ${error.message}`);
        }
    }

    /**
     * Delete a file from Cloudinary
     * @param publicId Public ID of the file to delete
     * @returns Deletion result
     */
    async deleteFile(publicId: string): Promise<MediaDeletionResult> {
        try {
            console.info(`Deleting file from Cloudinary: ${publicId}`);
            
            const result = await this.cloudinary.uploader.destroy(publicId);
            
            const success = result.result === 'ok';
            console.info(`File deletion ${success ? 'successful' : 'failed'}: ${publicId}`);
            
            return {
                publicId,
                success,
                message: result.result,
                statusCode: success ? 200 : 400
            };
        } catch (error: any) {
            console.error(`Failed to delete file ${publicId} from Cloudinary:`, error);
            return {
                publicId,
                success: false,
                message: `Failed to delete file: ${error.message}`,
                statusCode: 500
            };
        }
    }

    /**
     * Generate a transformation URL for an existing image
     * @param publicId Public ID of the image
     * @param transformations Transformation options
     * @returns Transformed image URL
     */
    async getTransformedUrl(publicId: string, transformations: ImageTransformation): Promise<string> {
        try {
            console.info(`Generating transformed URL for image: ${publicId}`);
            
            const options = this.formatTransformation(transformations);
            const url = this.cloudinary.url(publicId, options);
            
            console.info(`Generated transformed URL for image: ${publicId}`);
            return url;
        } catch (error: any) {
            console.error(`Failed to generate transformed URL for image ${publicId}:`, error);
            throw new Error(`Failed to generate transformed URL: ${error.message}`);
        }
    }

    /**
     * Get details of a file from Cloudinary
     * @param publicId Public ID of the file
     * @returns File details
     */
    async getFileDetails(publicId: string): Promise<MediaFileDetails> {
        try {
            console.info(`Getting file details from Cloudinary: ${publicId}`);
            
            const result = await this.cloudinary.api.resource(publicId);
            
            return {
                publicId: result.public_id,
                url: result.url,
                secureUrl: result.secure_url,
                format: result.format,
                bytes: result.bytes,
                resourceType: result.resource_type,
                createdAt: new Date(result.created_at),
                width: result.width,
                height: result.height,
                tags: result.tags,
                folder: result.folder,
                version: result.version,
                accessMode: result.access_mode,
                exists: true
            };
        } catch (error: any) {
            // If the resource doesn't exist, Cloudinary returns a 404
            if (error.http_code === 404) {
                return {
                    publicId,
                    url: '',
                    secureUrl: '',
                    format: '',
                    bytes: 0,
                    resourceType: '',
                    createdAt: new Date(),
                    exists: false
                };
            }
            
            console.error(`Failed to get file details for ${publicId} from Cloudinary:`, error);
            throw new Error(`Failed to get file details: ${error.message}`);
        }
    }

    /**
     * Format transformation options for Cloudinary
     * @param transformation Transformation options
     * @returns Formatted transformation options for Cloudinary
     */
    private formatTransformation(transformation: ImageTransformation): any {
        const result: any = {};
        
        // Map our transformation interface to Cloudinary's format
        if (transformation.width) result.width = transformation.width;
        if (transformation.height) result.height = transformation.height;
        if (transformation.crop) result.crop = transformation.crop;
        if (transformation.gravity) result.gravity = transformation.gravity;
        if (transformation.quality) result.quality = transformation.quality;
        if (transformation.format) result.format = transformation.format;
        if (transformation.fetchFormat) result.fetch_format = 'auto';
        if (transformation.effect) result.effect = transformation.effect;
        if (transformation.background) result.background = transformation.background;
        if (transformation.border) result.border = transformation.border;
        if (transformation.radius) result.radius = transformation.radius;
        if (transformation.angle) result.angle = transformation.angle;
        if (transformation.opacity) result.opacity = transformation.opacity;
        
        // Handle custom transformation string
        if (transformation.custom) {
            // Parse the custom string and merge with existing options
            const customOptions = transformation.custom.split(',').reduce((acc: any, part: string) => {
                const [key, value] = part.trim().split('_');
                if (key && value) acc[key] = value;
                return acc;
            }, {});
            
            Object.assign(result, customOptions);
        }
        
        return result;
    }

    /**
     * Map Cloudinary upload result to our MediaUploadResult interface
     * @param cloudinaryResult Result from Cloudinary upload
     * @returns Mapped MediaUploadResult
     */
    private mapCloudinaryResultToMediaUploadResult(cloudinaryResult: any): MediaUploadResult {
        return {
            publicId: cloudinaryResult.public_id,
            url: cloudinaryResult.url,
            secureUrl: cloudinaryResult.secure_url,
            originalFilename: cloudinaryResult.original_filename,
            format: cloudinaryResult.format,
            bytes: cloudinaryResult.bytes,
            resourceType: cloudinaryResult.resource_type,
            createdAt: new Date(cloudinaryResult.created_at),
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            tags: cloudinaryResult.tags,
            folder: cloudinaryResult.folder,
            assetId: cloudinaryResult.asset_id,
            version: cloudinaryResult.version,
            signature: cloudinaryResult.signature,
            metadata: cloudinaryResult.metadata
        };
    }

    /**
     * Create a temporary file from a buffer
     * @param buffer File buffer
     * @returns Path to the temporary file
     */
    private async createTempFileFromBuffer(buffer: Buffer): Promise<string> {
        return new Promise((resolve, reject) => {
            const tempDir = os.tmpdir();
            const tempFileName = `upload-${crypto.randomBytes(6).toString('hex')}.tmp`;
            const tempFilePath = path.join(tempDir, tempFileName);
            
            fs.writeFile(tempFilePath, buffer, (err) => {
                if (err) {
                    reject(new Error(`Failed to create temporary file: ${err.message}`));
                } else {
                    resolve(tempFilePath);
                }
            });
        });
    }

    /**
     * Delete a temporary file
     * @param filePath Path to the temporary file
     */
    private async deleteTempFile(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.warn(`Failed to delete temporary file ${filePath}: ${err.message}`);
                }
                resolve();
            });
        });
    }
}
