import { inject, injectable } from 'inversify';
import { TYPES } from '../../../Core/Types/Constants';
import { IStripeWebhookService } from '../../../Core/Application/Interface/Services/IStripeWebhookService';
import { PaymentTransactionRepository } from '../../Repository/SQL/auth/PaymentTransactionRepository';
import { TransactionManager } from '../../Repository/SQL/Abstractions/TransactionManager';
import { BaseService } from '../base/BaseService';
import { Console } from '../../Utils/Console';
import Stripe from 'stripe';
import { PaymentTransaction, PaymentTransactionStatus, PaymentTransactionType } from '../../../Core/Types/PaymentTransaction';
import { ValidationError } from '../../../Core/Application/Error/AppError';
import { IPaymentService } from '../../../Core/Application/Interface/Services/IPaymentService';

/**
 * Service for handling Stripe webhook events
 * Implements retry logic and comprehensive error handling
 */
@injectable()
export class StripeWebhookService extends BaseService implements IStripeWebhookService {
    private readonly stripe: Stripe;
    private readonly maxRetries = 3;
    private readonly retryDelayMs = 1000; // 1 second initial delay
    protected readonly logger = Console;

    constructor(
        @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
        @inject(TYPES.PaymentTransactionRepository) private readonly paymentTransactionRepository: PaymentTransactionRepository,
        @inject(TYPES.PaymentService) private readonly paymentService: IPaymentService
    ) {
        super(transactionManager);
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2025-06-30.basil'
        });
    }

    /**
     * Process a Stripe webhook event with retry logic
     * @param event The Stripe event object received from webhook
     */
    async processWebhookEvent(event: Stripe.Event): Promise<void> {
        try {
            this.logger.info(`Processing Stripe webhook event: ${event.type}`, {
                eventId: event.id,
                eventType: event.type,
                created: new Date(event.created * 1000).toISOString()
            });

            // Process different event types
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.withRetry(() => this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent));
                    break;
                case 'payment_intent.payment_failed':
                    await this.withRetry(() => this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent));
                    break;
                case 'payment_intent.canceled':
                    await this.withRetry(() => this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent));
                    break;
                case 'charge.succeeded':
                    await this.withRetry(() => this.handleChargeSucceeded(event.data.object as Stripe.Charge));
                    break;
                case 'charge.failed':
                    await this.withRetry(() => this.handleChargeFailed(event.data.object as Stripe.Charge));
                    break;
                case 'charge.refunded':
                    await this.withRetry(() => this.handleChargeRefunded(event.data.object as Stripe.Charge));
                    break;
                case 'charge.dispute.created':
                    await this.withRetry(() => this.handleDisputeCreated(event.data.object as Stripe.Dispute));
                    break;
                case 'setup_intent.succeeded':
                    await this.withRetry(() => this.handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent));
                    break;
                case 'setup_intent.setup_failed':
                    await this.withRetry(() => this.handleSetupIntentFailed(event.data.object as Stripe.SetupIntent));
                    break;
                default:
                    this.logger.info(`Unhandled Stripe event type: ${event.type}`, { eventId: event.id });
            }
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process Stripe webhook event: ${error.message}`,
                eventId: event.id,
                eventType: event.type
            });
            // We don't rethrow the error here to ensure the webhook acknowledges receipt
            // Stripe will retry if we throw an error, which we don't want after we've logged it
        }
    }

    /**
     * Retry a function with exponential backoff
     * @param fn Function to retry
     * @returns Result of the function
     */
    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                
                if (attempt < this.maxRetries) {
                    const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
                    this.logger.warn(`Retry attempt ${attempt}/${this.maxRetries} after ${delayMs}ms`, {
                        error: error.message,
                        stack: error.stack
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        
        throw lastError || new Error('All retry attempts failed');
    }

    /**
     * Process a payment intent succeeded event
     * @param paymentIntent The payment intent object from the event
     */
    async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Payment intent succeeded: ${paymentIntent.id}`, {
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status
            });
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the payment transaction
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(paymentIntent.id);
            if (!transaction) {
                throw new ValidationError(`Payment transaction not found for payment intent: ${paymentIntent.id}`);
            }
            
            // Update transaction status
            await this.paymentTransactionRepository.update(transaction._id as string, {
                status: PaymentTransactionStatus.SUCCEEDED,
                updated_at: new Date()
            });
            
            await this.commitTransaction();
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process payment intent succeeded: ${error.message}`,
                paymentIntentId: paymentIntent.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        paymentIntentId: paymentIntent.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a payment intent failed event
     * @param paymentIntent The payment intent object from the event
     */
    async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Payment intent failed: ${paymentIntent.id}`, {
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                lastPaymentError: paymentIntent.last_payment_error?.message
            });
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the payment transaction
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(paymentIntent.id);
            if (!transaction) {
                throw new ValidationError(`Payment transaction not found for payment intent: ${paymentIntent.id}`);
            }
            
            // Update transaction status
            await this.paymentTransactionRepository.update(transaction._id as string, {
                status: PaymentTransactionStatus.FAILED,
                failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
                updated_at: new Date()
            });
            
            // update the session status
           
            
            await this.commitTransaction();
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process payment intent failed: ${error.message}`,
                paymentIntentId: paymentIntent.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        paymentIntentId: paymentIntent.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a payment intent canceled event
     * @param paymentIntent The payment intent object from the event
     */
    async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Payment intent canceled: ${paymentIntent.id}`, {
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status
            });
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the payment transaction
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(paymentIntent.id);
            if (!transaction) {
                throw new ValidationError(`Payment transaction not found for payment intent: ${paymentIntent.id}`);
            }
            
            // Update transaction status
            await this.paymentTransactionRepository.update(transaction._id as string, {
                status: PaymentTransactionStatus.FAILED, // Using FAILED since CANCELED doesn't exist
                updated_at: new Date()
            });
            
           // update the session status
            
            await this.commitTransaction();
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process payment intent canceled: ${error.message}`,
                paymentIntentId: paymentIntent.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        paymentIntentId: paymentIntent.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a charge succeeded event
     * @param charge The charge object from the event
     */
    async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Charge succeeded: ${charge.id}`, {
                amount: charge.amount,
                currency: charge.currency,
                paymentIntentId: charge.payment_intent
            });
            
            // If there's no payment intent, we can't link this charge to our records
            if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
                this.logger.warn(`Charge ${charge.id} has no payment intent ID, skipping processing`);
                return;
            }
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the payment transaction by payment intent ID
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(charge.payment_intent);
            if (!transaction) {
                this.logger.warn(`No transaction found for payment intent: ${charge.payment_intent}`);
                await this.rollbackTransaction();
                return;
            }
            
            // Update transaction with charge ID
            await this.paymentTransactionRepository.update(transaction._id as string, {
                provider_transaction_id: charge.id,
                status: PaymentTransactionStatus.SUCCEEDED,
                updated_at: new Date(),
                metadata: {
                    ...transaction.metadata,
                    charge_id: charge.id,
                    receipt_url: charge.receipt_url
                }
            });
            
            await this.commitTransaction();
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process charge succeeded: ${error.message}`,
                chargeId: charge.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        chargeId: charge.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a charge failed event
     * @param charge The charge object from the event
     */
    async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Charge failed: ${charge.id}`, {
                amount: charge.amount,
                currency: charge.currency,
                paymentIntentId: charge.payment_intent,
                failureCode: charge.failure_code,
                failureMessage: charge.failure_message
            });
            
            // If there's no payment intent, we can't link this charge to our records
            if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
                this.logger.warn(`Charge ${charge.id} has no payment intent ID, skipping processing`);
                return;
            }
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the payment transaction by payment intent ID
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(charge.payment_intent);
            if (!transaction) {
                this.logger.warn(`No transaction found for payment intent: ${charge.payment_intent}`);
                await this.rollbackTransaction();
                return;
            }
            
            // Update transaction with charge failure details
            await this.paymentTransactionRepository.update(transaction._id as string, {
                provider_transaction_id: charge.id,
                status: PaymentTransactionStatus.FAILED,
                failure_reason: charge.failure_message || 'Charge failed',
                updated_at: new Date(),
                metadata: {
                    ...transaction.metadata,
                    charge_id: charge.id,
                    failure_code: charge.failure_code
                }
            });
            
            // update the session status
            
            await this.commitTransaction();
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process charge failed: ${error.message}`,
                chargeId: charge.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        chargeId: charge.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a charge refunded event
     * @param charge The charge object from the event
     */
    async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Charge refunded: ${charge.id}`, {
                amount: charge.amount,
                amountRefunded: charge.amount_refunded,
                currency: charge.currency,
                paymentIntentId: charge.payment_intent
            });
            
            // If there's no payment intent, we can't link this charge to our records
            if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
                this.logger.warn(`Charge ${charge.id} has no payment intent ID, skipping processing`);
                return;
            }
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the payment transaction by payment intent ID
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(charge.payment_intent);
            if (!transaction) {
                this.logger.warn(`No transaction found for payment intent: ${charge.payment_intent}`);
                await this.rollbackTransaction();
                return;
            }
            
            // Update transaction with refund details
            await this.paymentTransactionRepository.update(transaction._id as string, {
                status: PaymentTransactionStatus.REFUNDED,
                updated_at: new Date(),
                metadata: {
                    ...transaction.metadata,
                    refunded: true,
                    refunded_at: new Date().toISOString(),
                    amount_refunded: charge.amount_refunded
                }
            });
            
            // Create a refund transaction record
            const refundTransaction: PaymentTransaction = {
                user_id: transaction.user_id,
                session_id: transaction.session_id,
                amount: -(charge.amount_refunded / 100), // Convert from cents to dollars and make negative
                currency: charge.currency,
                status: PaymentTransactionStatus.SUCCEEDED,
                type: PaymentTransactionType.REFUND,
                provider: 'stripe',
                provider_transaction_id: charge.refunds?.data[0]?.id,
                payment_intent_id: charge.payment_intent as string,
                payment_method_id: transaction.payment_method_id,
                metadata: {
                    original_charge_id: charge.id,
                    original_transaction_id: transaction._id,
                    refund_reason: charge.refunds?.data[0]?.reason
                },
                created_at: new Date(),
                updated_at: new Date()
            };
            
            await this.paymentTransactionRepository.create(refundTransaction);
            
            await this.commitTransaction();
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process charge refunded: ${error.message}`,
                chargeId: charge.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        chargeId: charge.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a charge dispute created event
     * @param dispute The dispute object from the event
     */
    async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
        let transactionSuccessfullyStarted = false;
        
        try {
            this.logger.info(`Dispute created: ${dispute.id}`, {
                amount: dispute.amount,
                currency: dispute.currency,
                chargeId: dispute.charge,
                reason: dispute.reason,
                status: dispute.status
            });
            
            // If there's no charge ID, we can't link this dispute to our records
            if (!dispute.charge || typeof dispute.charge !== 'string') {
                this.logger.warn(`Dispute ${dispute.id} has no charge ID, skipping processing`);
                return;
            }
            
            await this.beginTransaction();
            transactionSuccessfullyStarted = true;
            
            // Find the charge in Stripe to get the payment intent
            const charge = await this.stripe.charges.retrieve(dispute.charge);
            if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
                this.logger.warn(`Charge ${dispute.charge} has no payment intent ID, skipping processing`);
                await this.rollbackTransaction();
                return;
            }
            
            // Find the payment transaction by payment intent ID
            const transaction = await this.paymentTransactionRepository.findByPaymentIntentId(charge.payment_intent);
            if (!transaction) {
                this.logger.warn(`No transaction found for payment intent: ${charge.payment_intent}`);
                await this.rollbackTransaction();
                return;
            }
            
            // Update transaction with dispute details
            await this.paymentTransactionRepository.update(transaction._id as string, {
                status: PaymentTransactionStatus.FAILED, // Using FAILED since DISPUTED doesn't exist
                updated_at: new Date(),
                metadata: {
                    ...transaction.metadata,
                    disputed: true,
                    dispute_id: dispute.id,
                    dispute_reason: dispute.reason,
                    dispute_status: dispute.status,
                    dispute_created_at: new Date(dispute.created * 1000).toISOString()
                }
            });
            
            await this.commitTransaction();
            
            // Send alert for dispute
            this.logger.error(new Error(`Dispute created for charge ${dispute.charge}`), {
                message: `ALERT: Payment dispute created`,
                disputeId: dispute.id,
                chargeId: dispute.charge,
                amount: dispute.amount / 100, // Convert from cents to dollars
                reason: dispute.reason,
                transactionId: transaction._id
            });
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process dispute created: ${error.message}`,
                disputeId: dispute.id
            });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.rollbackTransaction();
                } catch (rollbackError: any) {
                    this.logger.error(rollbackError, {
                        message: `Failed to rollback transaction: ${rollbackError.message}`,
                        disputeId: dispute.id
                    });
                }
            }
            
            throw error;
        }
    }

    /**
     * Process a setup intent succeeded event
     * @param setupIntent The setup intent object from the event
     */
    async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
        try {
            this.logger.info(`Setup intent succeeded: ${setupIntent.id}`, {
                customerId: setupIntent.customer,
                paymentMethodId: setupIntent.payment_method,
                status: setupIntent.status
            });
            
            // No database updates needed as the payment method is added through the PaymentController
            // This is just for logging and monitoring
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process setup intent succeeded: ${error.message}`,
                setupIntentId: setupIntent.id
            });
            throw error;
        }
    }

    /**
     * Process a setup intent failed event
     * @param setupIntent The setup intent object from the event
     */
    async handleSetupIntentFailed(setupIntent: Stripe.SetupIntent): Promise<void> {
        try {
            this.logger.info(`Setup intent failed: ${setupIntent.id}`, {
                customerId: setupIntent.customer,
                paymentMethodId: setupIntent.payment_method,
                status: setupIntent.status,
                lastSetupError: setupIntent.last_setup_error?.message
            });
            
            // No database updates needed as the payment method addition would have failed in the PaymentController
            // This is just for logging and monitoring
        } catch (error: any) {
            this.logger.error(error, {
                message: `Failed to process setup intent failed: ${error.message}`,
                setupIntentId: setupIntent.id
            });
            throw error;
        }
    }
}