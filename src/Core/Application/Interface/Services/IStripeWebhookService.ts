import Stripe from 'stripe';

/**
 * Interface for Stripe webhook event processing service
 */
export interface IStripeWebhookService {
    /**
     * Process a Stripe webhook event
     * @param event The Stripe event object received from webhook
     */
    processWebhookEvent(event: Stripe.Event): Promise<void>;
    
    /**
     * Process a payment intent succeeded event
     * @param paymentIntent The payment intent object from the event
     */
    handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void>;
    
    /**
     * Process a payment intent failed event
     * @param paymentIntent The payment intent object from the event
     */
    handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void>;
    
    /**
     * Process a payment intent canceled event
     * @param paymentIntent The payment intent object from the event
     */
    handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void>;
    
    /**
     * Process a charge succeeded event
     * @param charge The charge object from the event
     */
    handleChargeSucceeded(charge: Stripe.Charge): Promise<void>;
    
    /**
     * Process a charge failed event
     * @param charge The charge object from the event
     */
    handleChargeFailed(charge: Stripe.Charge): Promise<void>;
    
    /**
     * Process a charge refunded event
     * @param charge The charge object from the event
     */
    handleChargeRefunded(charge: Stripe.Charge): Promise<void>;
    
    /**
     * Process a charge dispute created event
     * @param dispute The dispute object from the event
     */
    handleDisputeCreated(dispute: Stripe.Dispute): Promise<void>;
    
    /**
     * Process a setup intent succeeded event
     * @param setupIntent The setup intent object from the event
     */
    handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void>;
    
    /**
     * Process a setup intent failed event
     * @param setupIntent The setup intent object from the event
     */
    handleSetupIntentFailed(setupIntent: Stripe.SetupIntent): Promise<void>;
}
