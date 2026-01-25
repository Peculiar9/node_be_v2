import { Request, Response, NextFunction } from 'express';
import { injectable } from 'inversify';
import { performance } from 'perf_hooks';

@injectable()
export class PerformanceMiddleware {
    public static handle(req: Request, res: Response, next: NextFunction) {
        const start = performance.now();

        // Use 'finish' event to ensure headers are sent and response is complete
        res.on('finish', () => {
            const end = performance.now();
            const duration = (end - start).toFixed(2);
            
            // Note: In Express, setting headers after 'finish' is too late for the current response.
            // However, we can use res.setHeader before the response is sent.
            // A better way for Express is to override res.end or use a library, 
            // but for a simple middleware, we can just calculate it.
            // If we want it in the headers, we should do it differently.
        });

        // To actually inject into headers, we need to do it before headers are sent.
        // We can hook into res.writeHead or use a middleware pattern.
        
        const originalSend = res.send;
        res.send = function (body?: any): Response {
            const end = performance.now();
            const duration = (end - start).toFixed(2);
            res.setHeader('X-Response-Time', `${duration}ms`);
            return originalSend.call(this, body);
        };

        next();
    }
}
