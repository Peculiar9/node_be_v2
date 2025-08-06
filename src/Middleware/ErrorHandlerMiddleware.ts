import { Request, Response, NextFunction } from 'express';
import { injectable } from 'inversify';
import { Console } from '../Infrastructure/Utils/Console';
import { AppError, DatabaseError } from '../Core/Application/Error/AppError';
import * as Sentry from '@sentry/node';

@injectable()
export class ErrorHandlerMiddleware {
    public static handleError(err: any, req: Request, res: Response, next: NextFunction) {
        // Determine status code
        const statusCode = err.statusCode || 500;
        
        // Create a structured error object for logging
        const errorContext = {
            url: req.originalUrl,
            method: req.method,
            statusCode,
            errorName: err.name,
            errorCode: err.errorCode,
            stack: err.stack
        };
        
        // Log the error with appropriate severity
        if (statusCode >= 500) {
            Console.error(err, errorContext);
            
            // Report server errors to Sentry
            Sentry.captureException(err);
        } else {
            Console.warn(err.message, errorContext);
        }
        
        // Determine appropriate error message
        let message = err.message || 'An unexpected error occurred';
        
        // In production, don't expose internal server error details
        if (statusCode === 500 && process.env.NODE_ENV === 'production') {
            message = 'Internal Server Error';
        }
        
        // Send consistent JSON response
        return res.status(statusCode).json({
            success: false,
            message,
            errorCode: err.errorCode,
            data: null
        });
    }
}
