import { Request, Response } from 'express';
import {  inject } from 'inversify';
import { controller, httpGet, httpPost, httpDelete, httpPut, request, response } from 'inversify-express-utils';
import { API_PATH, TYPES } from '../../Core/Types/Constants';
import { IPaymentService } from '../../Core/Application/Interface/Services/IPaymentService';
import AuthMiddleware from '../../Middleware/AuthMiddleware';
import { BaseController } from '../BaseController';
import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';

@controller(`/${API_PATH}/payment`)
export class PaymentController extends BaseController{
    constructor(
        @inject(TYPES.PaymentService) private paymentService: IPaymentService
    ) {
        super();
    }
    
    /**
     * Create a Stripe setup intent for securely collecting payment method details
     */
    @httpPost('/setup-intent', AuthMiddleware.authenticate())
    async createSetupIntent(@request() req: Request, @response() res: Response) {
        try {

            const userId = req.user._id as string;
            
            // Get user from database to ensure they have a Stripe customer ID
            // If not, one will be created in the service
            const setupIntent = await this.paymentService.createSetupIntent(userId);
            
            return this.success(res, {
                clientSecret: setupIntent.client_secret
            }, ResponseMessage.SETUP_INTENT_CREATED_SUCCESS);
        } catch (error: any) {
            console.error('Error creating setup intent:', error);
            return this.error(res, error.message, error.statusCode);
        }
    }
    
    /**
     * Add a payment method to the user's account
     */
    @httpPost('/methods', AuthMiddleware.authenticate())
    async addPaymentMethod(@request() req: Request, @response() res: Response) {
        try {
            const { paymentMethodId, setAsDefault } = req.body;
            const userId = req.user._id as string;
            
            const paymentMethod = await this.paymentService.addPaymentMethod(
                userId, 
                paymentMethodId, 
                setAsDefault
            );
            
            return this.success(res, paymentMethod, ResponseMessage.PAYMENT_METHOD_ADDED_SUCCESS);
        } catch (error: any) {
            console.error('Error adding payment method:', error);
            return this.error(res, error.message, error.statusCode);
        }
    }
    
    /**
     * Get all payment methods for the current user
     */
    @httpGet('/methods', AuthMiddleware.authenticate())
    async getPaymentMethods(req: Request, res: Response) {
        try {
            const userId = req.user._id as string;
            const methods = await this.paymentService.getPaymentMethods(userId);
            
            return this.success(res, methods, ResponseMessage.PAYMENT_METHODS_RETRIEVED_SUCCESS);
        } catch (error: any) {
            console.error('Error getting payment methods:', error);
            return this.error(res, error.message, error.statusCode);
        }
    }
    
    /**
     * Set a payment method as default
     */
    @httpPut('/methods/default', AuthMiddleware.authenticate())
    async setDefaultPaymentMethod(req: Request, res: Response) {
        try {
            const { paymentMethodId } = req.body;
            const userId = req.user._id as string;
            
            await this.paymentService.setDefaultPaymentMethod(userId, paymentMethodId);
            
            return this.success(res, { success: true }, ResponseMessage.DEFAULT_PAYMENT_METHOD_SET_SUCCESS);
        } catch (error: any) {
            console.error('Error setting default payment method:', error);
            return this.error(res, error.message, error.statusCode);
        }
    }
    
    /**
     * Remove a payment method
     */
    @httpDelete('/methods/:paymentMethodId', AuthMiddleware.authenticate())
    async removePaymentMethod(req: Request, res: Response) {
        try {
            const { paymentMethodId } = req.params;
            const userId = req.user._id as string;
            
            await this.paymentService.removePaymentMethod(userId, paymentMethodId);
            
            return this.success(res, { success: true }, ResponseMessage.PAYMENT_METHOD_REMOVED_SUCCESS);
        } catch (error: any) {
            console.error('Error removing payment method:', error);
            return this.error(res, error.message, error.statusCode);
        }
    }
}
