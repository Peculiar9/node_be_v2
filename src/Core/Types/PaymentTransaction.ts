export enum PaymentTransactionStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentTransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  PRE_AUTHORIZATION = 'pre_authorization'
}

export interface PaymentTransaction {
  _id?: string;
  user_id: string;
  session_id: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus | string;
  type: PaymentTransactionType | string;
  provider: string; // 'stripe', etc.
  provider_transaction_id?: string; // Stripe charge ID, etc.
  payment_intent_id?: string; // Stripe payment intent ID
  payment_method_id?: string; // Reference to the payment method used
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
