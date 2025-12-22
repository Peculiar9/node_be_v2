/**
 * Commission status
 */
export enum CommissionStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    PAID = 'paid',
    DISPUTED = 'disputed',
    CANCELLED = 'cancelled'
}

/**
 * Payment status for commissions
 */
export enum PaymentStatus {
    UNPAID = 'unpaid',
    PAID = 'paid',
    REFUNDED = 'refunded',
    PARTIALLY_REFUNDED = 'partially_refunded'
}

/**
 * Earnings source type
 */
export enum EarningsSourceType {
    JOB_COMMISSION = 'job_commission',
    SUBSCRIPTION = 'subscription',
    FEATURED_LISTING = 'featured_listing',
    PREMIUM_PLACEMENT = 'premium_placement'
}

/**
 * Earnings status
 */
export enum EarningsStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    DISPUTED = 'disputed',
    REVERSED = 'reversed'
}

/**
 * Commission Configuration Entity
 */
export interface ICommissionConfig {
    _id?: string;
    config_name: string;
    platform_fee_percentage: number;
    installer_commission_percentage: number;
    min_job_amount?: number;
    max_job_amount?: number;
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Job Commission Entity
 */
export interface IJobCommission {
    _id?: string;
    job_id: string;
    installer_id: string;
    customer_id: string;
    
    // Amounts
    job_total_amount: number;
    platform_fee_percentage: number;
    platform_fee_amount: number;
    installer_commission_percentage: number;
    installer_commission_amount: number;
    
    // Status
    status: CommissionStatus | string;
    payment_status: PaymentStatus | string;
    
    // Payout tracking
    payout_id?: string;
    paid_at?: string;
    
    // Metadata
    commission_config_id: string;
    transaction_id?: string;
    notes?: string;
    
    created_at: string;
    updated_at: string;
}

/**
 * Company Earnings Entity
 */
export interface ICompanyEarnings {
    _id?: string;
    earnings_id: string;
    
    // Source
    source_type: EarningsSourceType;
    source_id: string;
    
    // Amounts
    amount: number;
    currency: string;
    
    // Details
    description: string;
    category: string;
    
    // Period tracking
    period_month: number;
    period_year: number;
    
    // Status
    status: EarningsStatus;
    
    // Metadata
    metadata?: Record<string, any>;
    
    created_at: string;
    updated_at: string;
}

/**
 * Installer Earnings Entity
 */
export interface IInstallerEarnings {
    _id?: string;
    installer_id: string;
    
    // Balance tracking
    total_earned: number;
    available_balance: number;
    pending_balance: number;
    withdrawn_balance: number;
    
    // Current period
    current_month_earnings: number;
    last_payout_amount?: number;
    last_payout_date?: string;
    
    // Statistics
    total_jobs_completed: number;
    average_commission_rate: number;
    
    // Bank details
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    paystack_recipient_code?: string;
    
    currency: string;
    created_at: string;
    updated_at: string;
}
