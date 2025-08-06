import { injectable, inject } from 'inversify';
import Stripe from 'stripe';
import { TYPES } from '../../../Core/Types/Constants';
import { IPaymentService, PaymentMethod, CreatePaymentIntentParams, CapturePaymentParams, RefundParams } from '../../../Core/Application/Interface/Services/IPaymentService';
import { PaymentTransaction, PaymentTransactionStatus, PaymentTransactionType } from '../../../Core/Types/PaymentTransaction';
import { ITransactionManager } from '../../../Core/Application/Interface/Database/ITransactionManager';
import { UserRepository } from '../../Repository/SQL/users/UserRepository';
import { PaymentTransactionRepository } from '../../Repository/SQL/auth/PaymentTransactionRepository';
import { UtilityService } from '../../../Core/Services/UtilityService';
import { AuthorizationError, ValidationError } from '../../../Core/Application/Error/AppError';
import { BaseService } from '../base/BaseService';
import { TransactionManager } from '../../Repository/SQL/Abstractions/TransactionManager';

/**
 * Implementation of the Payment Service using Stripe
 */
@injectable()
export class StripePaymentService extends BaseService implements IPaymentService {
    private readonly stripe: Stripe;
    private readonly defaultCurrency: string = 'usd';
    private readonly preAuthAmount: number = 2000; // $20.00 default pre-auth amount in cents

    constructor(
        @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.PaymentTransactionRepository) private readonly paymentTransactionRepository: PaymentTransactionRepository,
        @inject(TYPES.STRIPE_SECRET_KEY) private readonly stripeSecretKey: string,
        @inject(TYPES.STRIPE_PRE_AUTH_AMOUNT) private readonly configuredPreAuthAmount?: number
    ) {
        super(transactionManager);
        this.stripe = new Stripe(this.stripeSecretKey, {
            apiVersion: '2025-06-30.basil', // Use the latest stable API version
        });
        
        if (this.configuredPreAuthAmount) {
            console.debug(`Pre-auth amount set to ${this.configuredPreAuthAmount}`);
            this.preAuthAmount = this.configuredPreAuthAmount;
        }
    }

    /**
     * Create a setup intent for securely collecting payment method details
     * @param userId User ID in our system
     * @returns Setup intent with client secret
     */
    async createSetupIntent(userId: string): Promise<{ id: string; client_secret: string }> {
        let transactionSuccessfullyStarted = false;
        
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            console.info(`Creating setup intent for user ${userId}`);
            
            // Get user with Stripe customer ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(`User with ID ${userId} not found`);
            }
            
            // Create Stripe customer if not exists
            if (!user.stripe_id) {
                console.info(`User ${userId} does not have a Stripe customer ID, creating one`);
                const customerName = user.first_name && user.last_name ? 
                    `${user.first_name} ${user.last_name}` : 'Customer';
                
                const customer = await this.stripe.customers.create({
                    email: user.email,
                    name: customerName,
                    metadata: {
                        userId: userId
                    }
                });
                
                // Update user with Stripe customer ID
                await this.userRepository.update(userId, { stripe_id: customer.id });
                user.stripe_id = customer.id;
            }
            
            // Create setup intent
            const setupIntent = await this.stripe.setupIntents.create({
                customer: user.stripe_id,
                payment_method_types: ['card'],
                usage: 'off_session', // Allow future off-session payments
                metadata: {
                    userId: userId
                }
            });
            
            await this.transactionManager.commit();
            console.info(`Successfully created setup intent for user ${userId}`);
            
            return {
                id: setupIntent.id,
                client_secret: setupIntent.client_secret as string
            };
        } catch (error: any) {
            console.error(`Failed to create setup intent for user ${userId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to create setup intent: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to create setup intent: ${error.message}`);
        }
    }

    /**
     * Create a customer in Stripe
     * @param userId User ID in our system
     * @param email User email
     * @param name User name
     * @returns Stripe customer ID
     */
    async createCustomer(userId: string, email: string, name: string): Promise<string> {
        let transactionSuccessfullyStarted = false;
        
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            console.info(`Creating Stripe customer for user ${userId}`);
            
            // Check if user already has a Stripe customer ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }
            
            if (user.stripe_id) {
                console.info(`User ${userId} already has a Stripe customer ID: ${user.stripe_id}`);
                await this.transactionManager.commit();
                return user.stripe_id;
            }
            
            // Create customer in Stripe
            const customer = await this.stripe.customers.create({
                email,
                name,
                metadata: {
                    userId
                }
            });
            
            // Update user with Stripe customer ID
            await this.userRepository.update(userId, { stripe_id: customer.id });
            
            await this.transactionManager.commit();
            console.info(`Successfully created Stripe customer for user ${userId}: ${customer.id}`);
            
            return customer.id;
        } catch (error: any) {
            console.error(`Failed to create Stripe customer for user ${userId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to create Stripe customer: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to create payment customer: ${error.message}`);
        }
    }

    /**
     * Add a payment method to a customer
     * @param userId User ID in our system
     * @param paymentMethodToken Token from Stripe Elements
     * @param setAsDefault Whether to set this payment method as default
     * @returns Payment method details
     */
    async addPaymentMethod(userId: string, paymentMethodToken: string, setAsDefault: boolean = true): Promise<PaymentMethod> {
        let transactionSuccessfullyStarted = false;
        
        try {
            await this.transactionManager.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            console.info(`Adding payment method for user ${userId}`);
            
            // Get user with Stripe customer ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }
            
            if (!user.stripe_id) {
                throw new Error(`User ${userId} does not have a Stripe customer ID`);
            }
            
            // Retrieve the payment method to verify it exists
            const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodToken);
            
            // Attach payment method to customer
            await this.stripe.paymentMethods.attach(paymentMethodToken, {
                customer: user.stripe_id
            });
            
            // Set as default payment method if requested
            if (setAsDefault) {
                await this.stripe.customers.update(user.stripe_id, {
                    invoice_settings: {
                        default_payment_method: paymentMethodToken
                    }
                });
            }
            
            // Update user's stored payment methods
            const card = paymentMethod.card;
            const paymentMethodData: PaymentMethod = {
                id: paymentMethod.id,
                type: paymentMethod.type,
                brand: card?.brand,
                last4: card?.last4,
                expMonth: card?.exp_month,
                expYear: card?.exp_year,
                isDefault: setAsDefault
            };
            
            // Store card token in user record
            const cardTokens = user.card_tokens || [];
            const updatedCardTokens = cardTokens.filter((token: any) => token.id !== paymentMethodData.id);
            updatedCardTokens.push(paymentMethodData);
            console.log("updatedCardTokens", updatedCardTokens);
            
            await this.userRepository.update(userId, { card_tokens: updatedCardTokens });
            
            await this.transactionManager.commit();
            console.info(`Successfully added payment method for user ${userId}`);
            
            return paymentMethodData;
        } catch (error: any) {
            console.error(`Failed to add payment method for user ${userId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to add payment method: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to add payment method: ${error.message}`);
        }
    }

    /**
     * Get all payment methods for a user
     * @param userId User ID in our system
     * @returns Array of payment methods
     */
    async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
        let transactionSuccessfullyStarted = false;
        try {

            transactionSuccessfullyStarted = await this.beginTransaction();
            console.info(`Getting payment methods for user ${userId}`);
            
            // Get user with Stripe customer ID
            const user = await this.userRepository.findById(userId);
            console.log("Payment user", user);
            if (!user) {
                throw new AuthorizationError(`User with ID ${userId} not found`);
            }
            
            if (!user.stripe_id) {
                return []; // No Stripe customer ID means no payment methods
            }
            
            // Get payment methods from Stripe
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: user.stripe_id,
                type: 'card'
            });
            
            console.log("Payment methods", paymentMethods.data);
            // Get default payment method
            const customer = await this.stripe.customers.retrieve(user.stripe_id);
            
            console.log("Customer", customer);
            // Check if customer exists and is not deleted
            const defaultPaymentMethodId = 
                typeof customer !== 'string' && 
                !('deleted' in customer) && 
                customer.invoice_settings?.default_payment_method;
            
            console.log("Default payment method", defaultPaymentMethodId);
            await this.commitTransaction();
            // Map to our PaymentMethod interface
            return paymentMethods.data.map((pm: any) => {
                const card = pm.card;
                return {
                    id: pm.id,
                    type: pm.type,
                    brand: card?.brand,
                    last4: card?.last4,
                    expMonth: card?.exp_month,
                    expYear: card?.exp_year,
                    isDefault: pm.id === defaultPaymentMethodId
                };
            });
        } catch (error: any) {
            console.error(`Failed to get payment methods for user ${userId}: ${error.message}`, error);
            await this.rollbackTransaction();
            throw new Error(`Failed to get payment methods: ${error.message}`);
        }
    }

    /**
     * Set a payment method as default
     * @param userId User ID in our system
     * @param paymentMethodId Payment method ID
     */
    async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            console.info(`Setting default payment method ${paymentMethodId} for user ${userId}`);
            
            // Get user with Stripe customer ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }
            
            if (!user.stripe_id) {
                throw new Error(`User ${userId} does not have a Stripe customer ID`);
            }
            
            // Set as default payment method in Stripe
            await this.stripe.customers.update(user.stripe_id, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });
            
            // Update user's stored payment methods
            if (user.card_tokens && user.card_tokens.length > 0) {
                const updatedCardTokens = user.card_tokens.map((token: any) => ({
                    ...token,
                    isDefault: token.id === paymentMethodId
                }));
                
                await this.userRepository.update(userId, { card_tokens: updatedCardTokens });
            }
            
            await this.commitTransaction();
            console.info(`Successfully set default payment method for user ${userId}`);
        } catch (error: any) {
            console.error(`Failed to set default payment method for user ${userId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to set default payment method: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to set default payment method: ${error.message}`);
        }
    }

    /**
     * Remove a payment method
     * @param userId User ID in our system
     * @param paymentMethodId Payment method ID
     */
    async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            console.info(`Removing payment method ${paymentMethodId} for user ${userId}`);
            
            // Get user with Stripe customer ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }
            
            if (!user.stripe_id) {
                throw new Error(`User ${userId} does not have a Stripe customer ID`);
            }
            
            // Check if this is the default payment method
            const customer = await this.stripe.customers.retrieve(user.stripe_id);
            const isDefault = typeof customer !== 'string' && 
                              !('deleted' in customer) && 
                              customer.invoice_settings?.default_payment_method === paymentMethodId;
            
            // Detach payment method from customer
            await this.stripe.paymentMethods.detach(paymentMethodId);
            
            // Update user's stored payment methods
            if (user.card_tokens && user.card_tokens.length > 0) {
                const updatedCardTokens = user.card_tokens.filter((token: any) => token.id !== paymentMethodId);
                
                // If we removed the default payment method and there are other payment methods,
                // set the first one as default
                if (isDefault && updatedCardTokens.length > 0) {
                    const newDefaultId = updatedCardTokens[0].id;
                    updatedCardTokens[0].isDefault = true;
                    
                    await this.stripe.customers.update(user.stripe_id, {
                        invoice_settings: {
                            default_payment_method: newDefaultId
                        }
                    });
                }
                
                await this.userRepository.update(userId, { card_tokens: updatedCardTokens });
            }
            
            await this.commitTransaction();
            console.info(`Successfully removed payment method for user ${userId}`);
        } catch (error: any) {
            console.error(`Failed to remove payment method for user ${userId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to remove payment method: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to remove payment method: ${error.message}`);
        }
    }

    /**
     * Create a payment intent (authorization hold)
     * @param params Payment intent parameters
     * @returns Payment transaction record
     */
    async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentTransaction> {
        let transactionSuccessfullyStarted = false;
        
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            console.info(`Creating payment intent for user ${params.userId}, session ${params.sessionId}`);
            
            // Get user with Stripe customer ID
            const user = await this.userRepository.findById(params.userId);
            if (!user) {
                throw new Error(`User with ID ${params.userId} not found`);
            }
            
            if (!user.stripe_id) {
                throw new Error(`User ${params.userId} does not have a Stripe customer ID`);
            }
            
            // For pre-authorization, we use a fixed amount
            const amount = params.type === PaymentTransactionType.PRE_AUTHORIZATION 
                ? this.preAuthAmount 
                : params.amount;
            
            // Create payment intent in Stripe
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount,
                currency: params.currency.toLowerCase(),
                customer: user.stripe_id,
                capture_method: 'manual', // Important for pre-auth flow
                confirm: true,
                metadata: {
                    userId: params.userId,
                    sessionId: params.sessionId,
                    type: params.type,
                    ...params.metadata
                }
            });
            
            // Create transaction record
            const transaction: PaymentTransaction = {
                user_id: params.userId,
                session_id: params.sessionId,
                amount,
                currency: params.currency,
                status: PaymentTransactionStatus.PENDING,
                type: params.type,
                provider: 'stripe',
                provider_transaction_id: paymentIntent.id,
                payment_intent_id: paymentIntent.id,
                payment_method_id: paymentIntent.payment_method as string,
                metadata: params.metadata,
                created_at: new Date(),
                updated_at: new Date()
            };
            
            await this.paymentTransactionRepository.create(transaction);
            
            await this.commitTransaction();
            console.info(`Successfully created payment intent for user ${params.userId}, session ${params.sessionId}`);
            
            return transaction;
        } catch (error: any) {
            console.error(`Failed to create payment intent for user ${params.userId}, session ${params.sessionId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to create payment intent: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to create payment intent: ${error.message}`);
        }
    }

    /**
     * Capture a previously created payment intent
     * @param params Capture parameters
     * @returns Updated payment transaction record
     */
    async capturePayment(params: CapturePaymentParams): Promise<PaymentTransaction> {
        let transactionSuccessfullyStarted = false;
        
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            console.info(`Capturing payment intent ${params.paymentIntentId} for amount ${params.amount}`);
            
            // Find the transaction record
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(params.paymentIntentId);
            if (!transaction) {
                throw new Error(`Transaction with payment intent ID ${params.paymentIntentId} not found`);
            }
            
            // Capture the payment intent in Stripe
            const capturedIntent = await this.stripe.paymentIntents.capture(params.paymentIntentId, {
                amount_to_capture: params.amount,
                metadata: params.metadata
            });
            
            // Update transaction record
            const updatedTransaction: Partial<PaymentTransaction> = {
                amount: params.amount,
                status: PaymentTransactionStatus.SUCCEEDED,
                provider_transaction_id: UtilityService.generateUUID()/*TODO: Actual values => capturedIntent.latest_charge as string*/,
                updated_at: new Date(),
                metadata: {
                    ...transaction.metadata,
                    ...params.metadata
                }
            };
            
            await this.paymentTransactionRepository.update(transaction._id as string, updatedTransaction);
            
            await this.commitTransaction();
            console.info(`Successfully captured payment intent ${params.paymentIntentId}`);
            
            return {
                ...transaction,
                ...updatedTransaction
            } as PaymentTransaction;

        } catch (error: any) {
            console.error(`Failed to capture payment intent ${params.paymentIntentId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to capture payment: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to capture payment: ${error.message}`);
        }
    }

    /**
     * Cancel a payment intent
     * @param paymentIntentId Payment intent ID
     */
    async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            console.info(`Cancelling payment intent ${paymentIntentId}`);
            
            // Find the transaction record
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(paymentIntentId);
            if (!transaction) {
                throw new Error(`Transaction with payment intent ID ${paymentIntentId} not found`);
            }
            
            // Cancel the payment intent in Stripe
            await this.stripe.paymentIntents.cancel(paymentIntentId);
            
            // Update transaction record
            await this.paymentTransactionRepository.update(transaction._id as string, {
                status: PaymentTransactionStatus.FAILED,
                failure_reason: 'Cancelled by system',
                updated_at: new Date()
            });
            
            await this.commitTransaction();
            console.info(`Successfully cancelled payment intent ${paymentIntentId}`);
        } catch (error: any) {
            console.error(`Failed to cancel payment intent ${paymentIntentId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to cancel payment intent: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to cancel payment intent: ${error.message}`);
        }
    }

    /**
     * Process a refund
     * @param params Refund parameters
     * @returns Refund transaction record
     */
    async processRefund(params: RefundParams): Promise<PaymentTransaction> {
        let transactionSuccessfullyStarted = false;
        
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            console.info(`Processing refund for transaction ${params.transactionId}`);
            
            // Find the original transaction
            const originalTransaction = await this.paymentTransactionRepository.findById(params.transactionId);
            if (!originalTransaction) {
                throw new Error(`Transaction with ID ${params.transactionId} not found`);
            }
            
            if (originalTransaction.status !== PaymentTransactionStatus.SUCCEEDED) {
                throw new Error(`Cannot refund transaction ${params.transactionId} with status ${originalTransaction.status}`);
            }
            
            if (!originalTransaction.provider_transaction_id) {
                throw new Error(`Transaction ${params.transactionId} has no provider transaction ID`);
            }
            
            // Process refund in Stripe
            const refund = await this.stripe.refunds.create({
                charge: originalTransaction.provider_transaction_id,
                amount: params.amount,
                reason: params.reason as Stripe.RefundCreateParams.Reason
            });
            
            // Create refund transaction record
            const refundTransaction: PaymentTransaction = {
                user_id: originalTransaction.user_id,
                session_id: originalTransaction.session_id,
                amount: params.amount || originalTransaction.amount,
                currency: originalTransaction.currency,
                status: PaymentTransactionStatus.SUCCEEDED,
                type: PaymentTransactionType.REFUND,
                provider: 'stripe',
                provider_transaction_id: refund.id,
                payment_intent_id: originalTransaction.payment_intent_id,
                payment_method_id: originalTransaction.payment_method_id,
                metadata: {
                    original_transaction_id: originalTransaction._id as string,
                    reason: params.reason
                },
                created_at: new Date(),
                updated_at: new Date()
            };
            
            await this.paymentTransactionRepository.create(refundTransaction);
            
            // Update original transaction
            await this.paymentTransactionRepository.update(originalTransaction._id as string, {
                status: PaymentTransactionStatus.REFUNDED,
                updated_at: new Date(),
                metadata: {
                    ...originalTransaction.metadata,
                    refunded: true,
                    refund_id: refundTransaction._id as string
                }
            });
            
            await this.commitTransaction();
            console.info(`Successfully processed refund for transaction ${params.transactionId}`);
            
            return refundTransaction;
        } catch (error: any) {
            console.error(`Failed to process refund for transaction ${params.transactionId}: ${error.message}`, error);
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    console.error(`Failed to rollback transaction after failing to process refund: ${rollbackError.message}`, rollbackError);
                }
            }
            
            throw new Error(`Failed to process refund: ${error.message}`);
        }
    }

    /**
     * Get transaction by ID
     * @param transactionId Transaction ID
     * @returns Payment transaction record
     */
    async getTransaction(transactionId: string): Promise<PaymentTransaction> {
        try {
            console.info(`Getting transaction ${transactionId}`);
            
            const transaction = await this.paymentTransactionRepository.findById(transactionId);
            if (!transaction) {
                throw new Error(`Transaction with ID ${transactionId} not found`);
            }
            
            return transaction;
        } catch (error: any) {
            console.error(`Failed to get transaction ${transactionId}: ${error.message}`, error);
            throw new Error(`Failed to get transaction: ${error.message}`);
        }
    }
}
