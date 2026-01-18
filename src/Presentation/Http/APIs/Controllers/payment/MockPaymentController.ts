// import { Request, Response } from 'express';
// import { controller, httpGet, httpPost, httpDelete, httpPut } from 'inversify-express-utils';
// import { API_PATH } from '@Core/Types/Constants';
// import { PaymentMethod } from '@Core/Application/Interface/Services/IPaymentService';
// import { validationMiddleware } from '../../Middleware/ValidationMiddleware';
// import { AddPaymentMethodDTO, SetDefaultPaymentMethodDTO } from '@Core/Application/DTOs/PaymentDTO';
// import { AuthMiddleware } from '../../Middleware/AuthMiddleware';
// import { BaseController } from '../BaseController';

// /**
//  * Mock implementation of the PaymentController for testing purposes
//  * This controller simulates the behavior of the real PaymentController without making actual API calls
//  */
// @controller(`${API_PATH}/mock-payment`)
// export class MockPaymentController extends BaseController {
//     // In-memory storage for payment methods
//     private paymentMethods: Map<string, PaymentMethod[]> = new Map();
//     private defaultPaymentMethods: Map<string, string> = new Map();
    
//     constructor() {
//         super();
//         console.info('MockPaymentController initialized');
//     }
    
//     /**
//      * Create a mock setup intent for securely collecting payment method details
//      */
//     @httpPost('/setup-intent', AuthMiddleware.authenticate())
//     async createSetupIntent(req: Request, res: Response) {
//         try {
//             const userId = res.locals.user._id as string;
//             console.info(`Creating mock setup intent for user ${userId}`);
            
//             // Generate a fake client secret
//             const clientSecret = `seti_mock_${userId}_${Date.now()}_secret_${this.generateRandomString(24)}`;
            
//             return res.json({
//                 clientSecret: clientSecret
//             });
//         } catch (error: any) {
//             console.error('Error creating mock setup intent:', error);
//             return res.status(500).json({ 
//                 error: 'Failed to create mock setup intent',
//                 message: error.message 
//             });
//         }
//     }
    
//     /**
//      * Add a mock payment method to the user's account
//      */
//     @httpPost('/methods', AuthMiddleware.authenticate(), validationMiddleware(AddPaymentMethodDTO))
//     async addPaymentMethod(req: Request, res: Response) {
//         try {
//             const { paymentMethodId, setAsDefault } = req.body;
//             const userId = res.locals.user._id as string;
            
//             console.info(`Adding mock payment method ${paymentMethodId} for user ${userId}`);
            
//             // Create a mock payment method
//             const paymentMethod: PaymentMethod = {
//                 id: paymentMethodId,
//                 type: 'card',
//                 brand: 'visa',
//                 last4: this.generateRandomDigits(4),
//                 expMonth: Math.floor(Math.random() * 12) + 1,
//                 expYear: new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
//                 isDefault: setAsDefault === true
//             };
            
//             // Store the payment method in memory
//             if (!this.paymentMethods.has(userId)) {
//                 this.paymentMethods.set(userId, []);
//             }
            
//             const userPaymentMethods = this.paymentMethods.get(userId)!;
//             userPaymentMethods.push(paymentMethod);
            
//             // Set as default if requested
//             if (setAsDefault) {
//                 this.defaultPaymentMethods.set(userId, paymentMethodId);
                
//                 // Update isDefault flag for all payment methods
//                 userPaymentMethods.forEach(pm => {
//                     pm.isDefault = pm.id === paymentMethodId;
//                 });
//             }
            
//             return res.json(paymentMethod);
//         } catch (error: any) {
//             console.error('Error adding mock payment method:', error);
//             return res.status(500).json({ 
//                 error: 'Failed to add mock payment method',
//                 message: error.message 
//             });
//         }
//     }
    
//     /**
//      * Get all mock payment methods for the current user
//      */
//     @httpGet('/methods', AuthMiddleware.authenticate())
//     async getPaymentMethods(req: Request, res: Response) {
//         try {
//             const userId = res.locals.user._id as string;
//             console.info(`Getting mock payment methods for user ${userId}`);
            
//             // Return the stored payment methods or an empty array
//             const methods = this.paymentMethods.get(userId) || [];
            
//             return res.json(methods);
//         } catch (error: any) {
//             console.error('Error getting mock payment methods:', error);
//             return res.status(500).json({ 
//                 error: 'Failed to get mock payment methods',
//                 message: error.message 
//             });
//         }
//     }
    
//     /**
//      * Set a mock payment method as default
//      */
//     @httpPut('/methods/default', AuthMiddleware.authenticate(), validationMiddleware(SetDefaultPaymentMethodDTO))
//     async setDefaultPaymentMethod(req: Request, res: Response) {
//         try {
//             const { paymentMethodId } = req.body;
//             const userId = res.locals.user._id as string;
            
//             console.info(`Setting mock payment method ${paymentMethodId} as default for user ${userId}`);
            
//             // Check if the payment method exists
//             const userPaymentMethods = this.paymentMethods.get(userId) || [];
//             const paymentMethodExists = userPaymentMethods.some(pm => pm.id === paymentMethodId);
            
//             if (!paymentMethodExists) {
//                 return res.status(404).json({
//                     error: 'Payment method not found',
//                     message: `Payment method ${paymentMethodId} not found for user ${userId}`
//                 });
//             }
            
//             // Set as default
//             this.defaultPaymentMethods.set(userId, paymentMethodId);
            
//             // Update isDefault flag for all payment methods
//             userPaymentMethods.forEach(pm => {
//                 pm.isDefault = pm.id === paymentMethodId;
//             });
            
//             return res.json({ success: true });
//         } catch (error: any) {
//             console.error('Error setting mock default payment method:', error);
//             return res.status(500).json({ 
//                 error: 'Failed to set mock default payment method',
//                 message: error.message 
//             });
//         }
//     }
    
//     /**
//      * Remove a mock payment method
//      */
//     @httpDelete('/methods/:paymentMethodId', AuthMiddleware.authenticate())
//     async removePaymentMethod(req: Request, res: Response) {
//         try {
//             const { paymentMethodId } = req.params;
//             const userId = res.locals.user._id as string;
            
//             console.info(`Removing mock payment method ${paymentMethodId} for user ${userId}`);
            
//             // Check if the user has payment methods
//             if (!this.paymentMethods.has(userId)) {
//                 return res.status(404).json({
//                     error: 'Payment method not found',
//                     message: `No payment methods found for user ${userId}`
//                 });
//             }
            
//             // Get the user's payment methods
//             const userPaymentMethods = this.paymentMethods.get(userId)!;
//             const initialLength = userPaymentMethods.length;
            
//             // Remove the payment method
//             const updatedPaymentMethods = userPaymentMethods.filter(pm => pm.id !== paymentMethodId);
            
//             if (updatedPaymentMethods.length === initialLength) {
//                 return res.status(404).json({
//                     error: 'Payment method not found',
//                     message: `Payment method ${paymentMethodId} not found for user ${userId}`
//                 });
//             }
            
//             // Update the stored payment methods
//             this.paymentMethods.set(userId, updatedPaymentMethods);
            
//             // If the removed payment method was the default, clear the default
//             if (this.defaultPaymentMethods.get(userId) === paymentMethodId) {
//                 this.defaultPaymentMethods.delete(userId);
                
//                 // If there are other payment methods, set the first one as default
//                 if (updatedPaymentMethods.length > 0) {
//                     this.defaultPaymentMethods.set(userId, updatedPaymentMethods[0].id);
//                     updatedPaymentMethods[0].isDefault = true;
//                 }
//             }
            
//             return res.json({ success: true });
//         } catch (error: any) {
//             console.error('Error removing mock payment method:', error);
//             return res.status(500).json({ 
//                 error: 'Failed to remove mock payment method',
//                 message: error.message 
//             });
//         }
//     }
    
//     /**
//      * Generate a random string of specified length
//      */
//     private generateRandomString(length: number): string {
//         const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//         let result = '';
//         for (let i = 0; i < length; i++) {
//             result += characters.charAt(Math.floor(Math.random() * characters.length));
//         }
//         return result;
//     }
    
//     /**
//      * Generate random digits of specified length
//      */
//     private generateRandomDigits(length: number): string {
//         const digits = '0123456789';
//         let result = '';
//         for (let i = 0; i < length; i++) {
//             result += digits.charAt(Math.floor(Math.random() * digits.length));
//         }
//         return result;
//     }
// }
