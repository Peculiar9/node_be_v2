import { Request, Response, NextFunction } from 'express';
import { injectable } from 'inversify';

@injectable()
export class CallbackMiddleware {
    private static readonly ACKNOWLEDGMENT_TIMEOUT = 2000; // 2 seconds

    /**
     * Middleware that quickly acknowledges webhook requests while allowing processing to continue
     * @param acknowledgeTimeout Optional timeout in ms before sending acknowledgment (default: 2000ms)
     */
    public static acknowledge(acknowledgeTimeout: number = CallbackMiddleware.ACKNOWLEDGMENT_TIMEOUT) {
        return async (req: Request, res: Response, next: NextFunction) => {
            // Create a promise that resolves after the specified timeout
            const timeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                    // Only send response if it hasn't been sent yet
                    if (!res.headersSent) {
                        res.status(200).json({
                            status: 'success',
                            message: 'Webhook received and being processed'
                        });
                    }
                    resolve();
                }, acknowledgeTimeout);
            });

            try {
                // Start processing in the background
                const processingPromise = new Promise<void>((resolve) => {
                    next();
                    resolve();
                });

                // Race between timeout and processing
                // If processing completes before timeout, the response will be handled normally
                // If timeout wins, we'll send the acknowledgment and continue processing
                await Promise.race([processingPromise, timeoutPromise]);
            } catch (error) {
                // If an error occurs before the timeout, let the error handler deal with it
                if (!res.headersSent) {
                    next(error);
                }
            }
        };
    }

    /**
     * Middleware that validates webhook signatures if required
     * @param secret The webhook secret for signature validation
     */
    public static validateSignature(secret: string) {
        return (req: Request, res: Response, next: NextFunction) => {
            try {
                const signature = req.headers['x-webhook-signature'];
                
                // If no signature is required or signature is valid
                if (!secret || !signature) {
                    return next();
                }

                // TODO: Implement signature validation logic here
                // This will depend on the specific webhook provider's signature format
                // Example:
                // const computedSignature = crypto
                //     .createHmac('sha256', secret)
                //     .update(JSON.stringify(req.body))
                //     .digest('hex');
                
                // if (signature !== computedSignature) {
                //     throw new Error('Invalid webhook signature');
                // }

                next();
            } catch (error) {
                next(error);
            }
        };
    }
}
