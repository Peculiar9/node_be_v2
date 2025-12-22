import { PaymentTransaction, PaymentTransactionType } from '../../../Types/PaymentTransaction';

export interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface CreatePaymentIntentParams {
  userId: string;
  sessionId: string;
  amount: number;
  currency: string;
  type: PaymentTransactionType;
  metadata?: Record<string, any>;
}

export interface CapturePaymentParams {
  paymentIntentId: string;
  amount: number;
  metadata?: Record<string, any>;
}

export interface RefundParams {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface IPaymentService {
  /**
   * Create a setup intent for securely collecting payment method details
   * @param userId User ID in our system
   * @returns Setup intent with client secret
   */
  createSetupIntent(userId: string): Promise<{ id: string; client_secret: string }>;

  /**
   * Create a customer in the payment provider system
   * @param userId User ID in our system
   * @param email User email
   * @param name User name
   * @returns Customer ID from the payment provider
   */
  createCustomer(userId: string, email: string, name: string): Promise<string>;

  /**
   * Add a payment method to a customer
   * @param userId User ID in our system
   * @param paymentMethodToken Token from the payment provider client-side SDK
   * @param setAsDefault Whether to set this payment method as default
   * @returns Payment method details
   */
  addPaymentMethod(userId: string, paymentMethodToken: string, setAsDefault?: boolean): Promise<PaymentMethod>;

  /**
   * Get all payment methods for a user
   * @param userId User ID in our system
   * @returns Array of payment methods
   */
  getPaymentMethods(userId: string): Promise<PaymentMethod[]>;

  /**
   * Set a payment method as default
   * @param userId User ID in our system
   * @param paymentMethodId Payment method ID
   */
  setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void>;

  /**
   * Remove a payment method
   * @param userId User ID in our system
   * @param paymentMethodId Payment method ID
   */
  removePaymentMethod(userId: string, paymentMethodId: string): Promise<void>;

  /**
   * Create a payment intent (authorization hold)
   * @param params Payment intent parameters
   * @returns Payment transaction record
   */
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentTransaction>;

  /**
   * Capture a previously created payment intent
   * @param params Capture parameters
   * @returns Updated payment transaction record
   */
  capturePayment(params: CapturePaymentParams): Promise<PaymentTransaction>;

  /**
   * Cancel a payment intent
   * @param paymentIntentId Payment intent ID
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<void>;

  /**
   * Process a refund
   * @param params Refund parameters
   * @returns Refund transaction record
   */
  processRefund(params: RefundParams): Promise<PaymentTransaction>;

  /**
   * Get transaction by ID
   * @param transactionId Transaction ID
   * @returns Payment transaction record
   */
  getTransaction(transactionId: string): Promise<PaymentTransaction>;
}
