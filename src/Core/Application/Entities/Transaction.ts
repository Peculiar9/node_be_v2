import { Column, CompositeIndex, ForeignKey, Index } from "peculiar-orm";
import { ValidationError } from "../Error/AppError";
import { TableNames } from "../Enums/TableNames";
import { ITransaction } from "../Interface/Entities/payments/IPayment";
import { TransactionType, TransactionStatus, RelatedEntityType } from "../Interface/Entities/payments/IPayment";

/**
 * Transaction Entity - Provider Agnostic
 * Stores payment transactions from any payment provider (Paystack, Stripe, etc.)
 * Provider-specific data stored in metadata field
 */
@CompositeIndex(['user_id', 'transaction_id'])
@CompositeIndex(['related_entity_type', 'related_entity_id'])
export class Transaction implements ITransaction {
    @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    public _id?: string;

    @Index({ unique: true })
    @Column('VARCHAR(255) NOT NULL UNIQUE')
    public transaction_id: string;

    @Index({ unique: false })
    @ForeignKey({
        table: TableNames.USERS,
        field: '_id',
        constraint: 'fk_transaction_user_id'
    })
    @Column('UUID NOT NULL')
    public user_id: string;

    @Index({ unique: false })
    @Column('VARCHAR(50) NOT NULL')
    public related_entity_type: RelatedEntityType | string;

    @Index({ unique: false })
    @Column('VARCHAR(255) NOT NULL')
    public related_entity_id: string;

    @Column('VARCHAR(50) NOT NULL')
    public type: TransactionType | string;

    @Column('DECIMAL(10,2) NOT NULL')
    public amount: number;

    @Column('VARCHAR(3) DEFAULT \'NGN\'')
    public currency: string;

    @Index({ unique: false })
    @Column('VARCHAR(50) DEFAULT \'pending\'')
    public status: TransactionStatus | string;

    // Generic payment reference (provider-agnostic)
    @Index({ unique: false })
    @Column('VARCHAR(255) DEFAULT NULL')
    public payment_reference?: string;

    // Generic authorization code (provider-agnostic)
    @Column('VARCHAR(255) DEFAULT NULL')
    public authorization_code?: string;

    // Generic access code (provider-agnostic)
    @Column('VARCHAR(255) DEFAULT NULL')
    public access_code?: string;

    // Payment channel (card, bank, ussd, mobile_money, etc.)
    @Column('VARCHAR(50) DEFAULT NULL')
    public payment_channel?: string;

    @Column('TEXT NOT NULL')
    public description: string;

    /**
     * Metadata field for provider-specific data
     * Examples:
     * - Paystack: { paystack_reference, paystack_access_code, paystack_authorization_code }
     * - Stripe: { stripe_payment_intent_id, stripe_charge_id }
     * - Flutterwave: { flw_ref, tx_ref }
     */
    @Column('JSONB DEFAULT NULL')
    public metadata?: Record<string, any>;

    @Column('TEXT DEFAULT NULL')
    public failure_reason?: string;

    @Column('DECIMAL(10,2) DEFAULT NULL')
    public refunded_amount?: number;

    @Column('TIMESTAMP WITH TIME ZONE DEFAULT NULL')
    public refunded_at?: string;

    @Column('TIMESTAMP WITH TIME ZONE DEFAULT NULL')
    public completed_at?: string;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public created_at: string;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public updated_at: string;

    private constructor(data: Partial<ITransaction>) {
        Object.assign(this, data);
        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || new Date().toISOString();
    }

    /**
     * Create a new transaction
     */
    static async create(data: Partial<ITransaction>): Promise<Transaction> {
        try {
            const transaction = new Transaction({
                ...data,
                transaction_id: data.transaction_id || Transaction.generateTransactionId(),
                currency: data.currency || 'NGN',
                status: data.status || TransactionStatus.PENDING,
            });

            await transaction.validate();
            return transaction;
        } catch (error: any) {
            console.error('Transaction creation error:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Update transaction
     */
    static async update(existingTransaction: ITransaction, updates: Partial<ITransaction>): Promise<Partial<ITransaction>> {
        try {
            const updatedData: Partial<ITransaction> = {
                _id: existingTransaction._id,
                ...updates,
                updated_at: new Date().toISOString()
            };

            const transaction = new Transaction(updatedData);
            await transaction.validateForUpdate();
            return updatedData;
        } catch (error: any) {
            console.error('Transaction update error:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Create a refund transaction
     */
    static createRefund(originalTransaction: ITransaction, refundAmount: number, reason?: string): Transaction {
        try {
            const refundData: Partial<ITransaction> = {
                transaction_id: Transaction.generateTransactionId(),
                user_id: originalTransaction.user_id,
                related_entity_type: originalTransaction.related_entity_type,
                related_entity_id: originalTransaction.related_entity_id,
                type: TransactionType.REFUND,
                amount: refundAmount,
                currency: originalTransaction.currency,
                status: TransactionStatus.PENDING,
                description: `Refund for transaction ${originalTransaction.transaction_id}`,
                metadata: {
                    original_transaction_id: originalTransaction._id,
                    original_transaction_ref: originalTransaction.transaction_id,
                    refund_reason: reason,
                    ...originalTransaction.metadata
                }
            };

            return new Transaction(refundData);
        } catch (error: any) {
            console.error('Refund transaction creation error:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Generate unique transaction ID
     */
    private static generateTransactionId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `TXN-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Validate transaction for creation
     */
    private async validate(): Promise<void> {
        if (!this.user_id) {
            throw new ValidationError('User ID is required');
        }

        if (!this.related_entity_type) {
            throw new ValidationError('Related entity type is required');
        }

        if (!this.related_entity_id) {
            throw new ValidationError('Related entity ID is required');
        }

        if (!this.type) {
            throw new ValidationError('Transaction type is required');
        }

        if (this.amount === undefined || this.amount <= 0) {
            throw new ValidationError('Amount must be greater than zero');
        }

        if (!this.description) {
            throw new ValidationError('Description is required');
        }

        // Validate status
        const validStatuses = Object.values(TransactionStatus);
        if (!validStatuses.includes(this.status as TransactionStatus)) {
            throw new ValidationError('Invalid transaction status');
        }

        // Validate type
        const validTypes = Object.values(TransactionType);
        if (!validTypes.includes(this.type as TransactionType)) {
            throw new ValidationError('Invalid transaction type');
        }

        // Validate related entity type
        const validEntityTypes = Object.values(RelatedEntityType);
        if (!validEntityTypes.includes(this.related_entity_type as RelatedEntityType)) {
            throw new ValidationError('Invalid related entity type');
        }
    }

    /**
     * Validate transaction for update
     */
    private async validateForUpdate(): Promise<void> {
        if (this.amount !== undefined && this.amount <= 0) {
            throw new ValidationError('Amount must be greater than zero');
        }

        if (this.status) {
            const validStatuses = Object.values(TransactionStatus);
            if (!validStatuses.includes(this.status as TransactionStatus)) {
                throw new ValidationError('Invalid transaction status');
            }
        }

        if (this.type) {
            const validTypes = Object.values(TransactionType);
            if (!validTypes.includes(this.type as TransactionType)) {
                throw new ValidationError('Invalid transaction type');
            }
        }
    }
}
