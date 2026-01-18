import { BASE_PATH } from "@Core/Types/Constants";
import { controller, httpPost, request, response } from "inversify-express-utils";
import { BaseController } from "./BaseController";
import { ResponseMessage } from "@Core/Application/Response/ResponseFormat";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "@Core/Types/Constants";
import AuthMiddleware from "../Middleware/AuthMiddleware";
import { uploadSingle } from "../Middleware/MulterMiddleware";
import { ValidationError } from "@Core/Application/Error/AppError";
import { IUser } from "@Core/Application/Interface/Entities/auth-and-user/IUser";
import { IFileUseCase } from "@Core/Application/Interface/UseCases/IFileUseCase";

@controller(`/${BASE_PATH}/files`)
export class FileController extends BaseController {
    constructor(
        @inject(TYPES.FileUseCase) private readonly fileUseCase: IFileUseCase
    ) {
        super();
    }

    /**
     * Upload single file/image/document utility endpoint
     * POST /files/upload
     */
    @httpPost("/upload", AuthMiddleware.authenticate(), uploadSingle('file'))
    async uploadFile(@request() req: Request, @response() res: Response) {
        try {
            const user = res.locals.user as IUser;
            const userId = user?._id;
            
            if (!userId) {
                return this.error(res, 'User authentication required', 401);
            }

            if (!req.file) {
                throw new ValidationError('File is required');
            }

            // Get upload purpose and file category from form data
            const uploadPurpose = req.body.upload_purpose as string;
            const fileCategory = req.body.file_category as string || 'general';

            if (!uploadPurpose) {
                throw new ValidationError('Upload purpose is required (e.g., profile_image, certificate, license_document, etc.)');
            }

            console.log('FileController::uploadFile -> ', {
                userId,
                uploadPurpose,
                fileCategory,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
            });

            // Use FileUseCase for proper abstraction
            const result = await this.fileUseCase.uploadFile(userId, req.file, uploadPurpose, fileCategory);

            return this.success(res, result, 'File uploaded successfully');
        } catch (error: any) {
            console.error('FileController::uploadFile error:', error);
            return this.error(res, error.message, error.statusCode || 500);
        }
    }
}
