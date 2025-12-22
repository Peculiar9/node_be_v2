import { controller, httpPost, request, response } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '../../Core/Types/Constants';
import { API_PATH } from '../../Core/Types/Constants';
import { BaseController } from '../BaseController';
import { CallbackMiddleware } from '../../Middleware/CallbackMiddleware';
import { IStripeWebhookService } from '../../Core/Application/Interface/Services/IStripeWebhookService';
import { Console } from '../../Infrastructure/Utils/Console';
import Stripe from 'stripe';

/**
 * Controller for handling Stripe webhook events
 * This controller receives webhook events from Stripe and processes them asynchronously
 */
@controller(`/${API_PATH}/webhooks/stripe`)
export class StripeWebhookController extends BaseController {
    constructor(
        @inject(TYPES.StripeWebhookService) private stripeWebhookService: IStripeWebhookService
    ) {
        super();
    }

    /**
     * Handles incoming Stripe webhook events
     * Uses CallbackMiddleware.acknowledge to quickly respond to Stripe while processing continues
     * Uses CallbackMiddleware.validateSignature to verify the webhook signature
     */
    @httpPost('/', 
        CallbackMiddleware.validateSignature(process.env.STRIPE_WEBHOOK_SECRET || ''),
        CallbackMiddleware.acknowledge(1000)
    )
    async handleWebhook(@request() req: Request, @response() res: Response) {
        try {
            const event = req.body as Stripe.Event;
            
            // Log the incoming webhook event
            Console.info('Received Stripe webhook event', { 
                type: event.type,
                id: event.id,
                created: new Date(event.created * 1000).toISOString()
            });

            // Process the event asynchronously
            await this.stripeWebhookService.processWebhookEvent(event);
            
            // If we get here and the response hasn't been sent yet (by the acknowledge middleware),
            // send a success response
            if (!res.headersSent) {
                return this.success(res, { received: true }, 'Webhook received successfully');
            }
        } catch (error: any) {
            Console.error(error, { 
                message: `StripeWebhookController::handleWebhook - ${error.message}`,
                webhook: req.body?.id || 'unknown'
            });
            
            // Only send error response if the acknowledge middleware hasn't sent a response yet
            if (!res.headersSent) {
                return this.error(res, error.message, error.statusCode || 500);
            }
        }
    }
}
