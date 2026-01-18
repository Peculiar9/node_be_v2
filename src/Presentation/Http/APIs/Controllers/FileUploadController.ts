import { controller, httpGet, httpPost, requestBody, response, request } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES, BASE_PATH } from '@Core/Types/Constants';
import { BaseController } from './BaseController';
import { ResponseMessage } from '@Core/Application/Response/ResponseFormat';
import { AuthMiddleware } from '../Middleware/AuthMiddleware';
import { uploadSingle } from '../Middleware/MulterMiddleware';

interface FileUploadResponseDTO {
    file_id: string;
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
}

@controller(`/${BASE_PATH}/files`)
export class FileUploadController extends BaseController {
    constructor() {
        super();
    }

    @httpGet("/")
    async base(@response() res: Response) {
        try {
            return this.success(res, {}, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/upload", AuthMiddleware.authenticate(), uploadSingle('file'))
    async uploadFile(
        @request() req: Request,
        @response() res: Response
    ) {
        try {
            if (!req.file) {
                return this.error(res, "No file provided", 400);
            }

            // Mock file upload response - TODO: Implement real file upload to S3/Cloudinary
            const mockResponse: FileUploadResponseDTO = {
                file_id: `file-${Date.now()}`,
                file_url: `https://example.com/uploads/${req.file.filename}`,
                file_name: req.file.originalname,
                file_size: req.file.size,
                mime_type: req.file.mimetype
            };

            return this.success(res, mockResponse, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }
}
