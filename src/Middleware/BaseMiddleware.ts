import { Request } from 'express';
import { ValidationError } from '../Core/Application/Error/AppError';
import { ResponseMessage } from '../Core/Application/Response/ResponseFormat';
import { injectable } from 'inversify';

@injectable()
export class BaseMiddleware {
    protected HandleEmptyReqBody(req: Request): void {
        if (!req || !req.body || Object.keys(req.body).length === 0) {
            throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
        }
    }

    protected validateRequiredFields(data: any, fields: string[]): void {
        for (const field of fields) {
            if (!data[field]) {
                throw new ValidationError(`${field} is required`);
            }
        }
    }
}