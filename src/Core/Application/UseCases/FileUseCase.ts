import { inject, injectable } from 'inversify';
import { IFileUseCase } from '../Interface/UseCases/IFileUseCase';
import { TYPES } from '../../Types/Constants';
import { IMediaService } from '../Interface/Services/IMediaService';
import { IFileService } from '../Interface/Services/IFileService';
import { ValidationError } from '../Error/AppError';
import { Console, LogLevel } from '../../../Infrastructure/Utils/Console';

@injectable()
export class FileUseCase implements IFileUseCase {
    constructor(
        @inject(TYPES.MediaService) private readonly mediaService: IMediaService,
        @inject(TYPES.FileService) private readonly fileService: IFileService
    ) {}

    /**
     * Upload a single file using Cloudinary service
     * @param userId User ID
     * @param file File to upload
     * @param uploadPurpose Purpose of the upload
     * @param fileCategory Optional file category
     * @returns Upload result with file URL and metadata
     */
    async uploadFile(userId: string, file: Express.Multer.File, uploadPurpose: string, fileCategory?: string): Promise<any> {
        try {
            Console.write('FileUseCase::uploadFile -> Starting file upload', LogLevel.INFO, {
                userId,
                uploadPurpose,
                fileCategory,
                fileSize: file.size,
                mimeType: file.mimetype
            });

            // Validate inputs
            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            if (!file) {
                throw new ValidationError('File is required');
            }

            if (!uploadPurpose) {
                throw new ValidationError('Upload purpose is required');
            }

            // Validate file type and size
            this.fileService.validateFileType(file.mimetype);
            this.fileService.validateFileSize(file.size);

            // Determine resource type for Cloudinary
            const resourceType = file.mimetype.startsWith('image/') ? 'image' as const : 
                               file.mimetype.startsWith('video/') ? 'video' as const : 'raw' as const;

            // Create folder structure: uploads/userId/uploadPurpose
            const folder = `uploads/${userId}/${uploadPurpose}`;

            // Upload to Cloudinary
            const uploadResult = await this.mediaService.uploadFile(file.buffer, {
                folder,
                resourceType,
                tags: [uploadPurpose, fileCategory || 'general', userId]
            });

            // Format response to match your expected structure
            const response = {
                file_url: uploadResult.secureUrl,
                file_name: uploadResult.publicId.split('/').pop() || uploadResult.publicId,
                file_extension: uploadResult.format,
                file_type: file.mimetype,
                upload_purpose: uploadPurpose,
                user_id: userId
            };

            Console.write('FileUseCase::uploadFile -> File upload completed successfully', LogLevel.INFO, {
                fileUrl: response.file_url,
                uploadPurpose: response.upload_purpose
            });

            return response;
        } catch (error: any) {
            Console.write('FileUseCase::uploadFile -> File upload failed', LogLevel.ERROR, {
                error: error.message,
                stack: error.stack,
                userId,
                uploadPurpose,
                fileCategory
            });
            throw error;
        }
    }
}
