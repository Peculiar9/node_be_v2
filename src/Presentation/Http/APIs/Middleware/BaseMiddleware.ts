import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '@Core/Application/Error/AppError';
import { ResponseMessage } from '@Core/Application/Response/ResponseFormat';
import { injectable } from 'inversify';

@injectable()
export class BaseMiddleware {

    protected static requestCounts: { [key: string]: RequestCount } = {};
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

    protected static rateLimitingPipeline(paramKey: string, { windowMs, maxRequests }: RateLimitOptions) {
        // Using a shared in-memory object; TODO: in production consider using a distributed store.
        const requestCounts = BaseMiddleware.requestCounts || {};
        // Convert windowMs (minutes) to milliseconds.
        const rateLimitWindow = windowMs * 60 * 1000;
      
        return function rateLimiter(req: Request, res: Response, next: NextFunction) {
          // Extract the query parameter for additional identification.
          const paramValue = String(req?.query[paramKey] ?? '');
          const identifier = `${req.ip}-${paramValue}`; // Use a delimiter for clarity
      
          // Initialize or update the request count.
          if (!requestCounts[identifier]) {
            requestCounts[identifier] = { count: 1, startTime: Date.now() };
          } else {
            requestCounts[identifier].count += 1;
          }
      
          const elapsedTime = Date.now() - requestCounts[identifier].startTime;
      
          // Check if within the current window.
          if (elapsedTime < rateLimitWindow) {
            if (requestCounts[identifier].count > maxRequests) {
              // Respond with rate limit error and return early.
            return res.status(429).json({
                success: false,
                message: ResponseMessage.RATE_LIMIT_ERROR,
                data: {},
                error: {
                    code: 12
                }
            });
         }
          } else {
            // Reset counter if time window has passed.
            requestCounts[identifier] = { count: 1, startTime: Date.now() };
          }
      
          // Proceed to next middleware/handler.
          next();
        };
      }


}

export interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
}

export interface RequestCount {
    count: number;
    startTime: number;
}
