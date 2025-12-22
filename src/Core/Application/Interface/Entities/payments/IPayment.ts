/**
 * Payment method types
 */
export enum PaymentMethodType {
    CARD = 'card',
    BANK_ACCOUNT = 'bank_account'
}

/**
 * Payment method status
 */
export enum PaymentMethodStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    EXPIRED = 'expired'
}

/**
 * Transaction types
 */
export enum TransactionType {
    PAYMENT = 'payment',
    REFUND = 'refund',
    PAYOUT = 'payout'
}

/**
 * Transaction status
 */
export enum TransactionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

/**
 * Payout status
 */
export enum PayoutStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    PAID = 'paid',
    FAILED = 'failed'
}

/**
 * Related entity types for transactions
 */
export enum RelatedEntityType {
    JOB = 'job',
    SUBSCRIPTION = 'subscription',
    PAYOUT = 'payout',
    DEPOSIT = 'deposit'
}

/**
 * Payment Method Entity
 */
export interface IPaymentMethod {
    _id?: string;
    user_id: string;
    stripe_payment_method_id: string;
    type: PaymentMethodType;
    is_default: boolean;
    card_details?: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
    };
    bank_details?: {
        bank_name: string;
        last4: string;
        account_type: string;
    };
    status: PaymentMethodStatus;
    created_at: string;
    updated_at: string;
}

/**
 * Transaction Entity - Provider Agnostic
 */
export interface ITransaction {
    _id?: string;
    transaction_id: string;
    user_id: string;
    related_entity_type: RelatedEntityType | string;
    related_entity_id: string;
    type: TransactionType | string;
    amount: number;
    currency: string;
    status: TransactionStatus | string;
    
    // Generic payment fields (provider-agnostic)
    payment_reference?: string;
    authorization_code?: string;
    access_code?: string;
    
    // Payment details
    payment_channel?: string; // 'card', 'bank', 'ussd', 'mobile_money'
    payment_method_id?: string;
    
    description: string;
    metadata?: Record<string, any>; // Provider-specific data goes here
    failure_reason?: string;
    refunded_amount?: number;
    refunded_at?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Payout Entity
 */
export interface IPayout {
    _id?: string;
    payout_id: string;
    installer_id: string;
    
    // Amount details
    amount: number;
    currency: string;
    
    // Paystack details
    paystack_transfer_code?: string;
    paystack_transfer_id?: string;
    paystack_recipient_code: string;
    
    // Bank details
    bank_name: string;
    account_number: string;
    account_name: string;
    
    // Jobs/Commissions included
    job_commissions: string[]; // Array of job_commission IDs
    
    // Status
    status: PayoutStatus;
    failure_reason?: string;
    
    // Tracking
    initiated_by: string;
    initiated_at: string;
    processed_at?: string;
    
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}
