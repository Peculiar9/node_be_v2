import { PaymentTransaction as IPaymentTransaction, PaymentTransactionStatus, PaymentTransactionType } from "../../Types/PaymentTransaction";
import { Column, CompositeIndex, ForeignKey, Index } from "../../../extensions/decorators";
import { ValidationError } from "../Error/AppError";
import { TableNames } from "../Enums/TableNames";
// import { CreatePaymentTransactionDTO, UpdatePaymentTransactionDTO } from "../DTOs/PaymentTransactionDTO";

@CompositeIndex(['user_id', 'session_id'])
export class PaymentTransaction implements IPaymentTransaction {
    @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    public _id?: string;

    @Index({ unique: false })
    @ForeignKey({
        table: TableNames.USERS,
        field: '_id',
        constraint: 'fk_payment_transaction_user_id'
    })
    @Column('UUID NOT NULL')
    public user_id: string;

    @Index({ unique: false })
    @Column('UUID NOT NULL')
    public session_id: string;

    @Column('DECIMAL(10,2) NOT NULL')
    public amount: number;

    @Column('VARCHAR(3) NOT NULL')
    public currency: string;

    @Column('VARCHAR(50) NOT NULL')
    public status: PaymentTransactionStatus | string;

    @Column('VARCHAR(50) NOT NULL')
    public type: PaymentTransactionType | string;

    @Column('VARCHAR(50) NOT NULL')
    public provider: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    public provider_transaction_id?: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    public payment_intent_id?: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    @ForeignKey({
        table: TableNames.PAYMENT_METHOD,
        field: '_id',
        constraint: 'fk_payment_transaction_payment_method_id'
    })
    public payment_method_id?: string;

    @Column('TEXT DEFAULT NULL')
    public failure_reason?: string;

    @Column('JSONB DEFAULT NULL')
    public metadata?: Record<string, any>;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public created_at: Date;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public updated_at: Date;

    private constructor(data: Partial<IPaymentTransaction>) {
        Object.assign(this, data);
    }

    // static async createFromDTO(dto: CreatePaymentTransactionDTO): Promise<PaymentTransaction | undefined> {
    //     try {
    //         const transactionData: Partial<IPaymentTransaction> = {
    //             user_id: dto.user_id,
    //             session_id: dto.session_id,
    //             amount: dto.amount,
    //             currency: dto.currency || 'USD',
    //             status: dto.status || PaymentTransactionStatus.PENDING,
    //             type: dto.type || PaymentTransactionType.CHARGE,
    //             provider: dto.provider,
    //             provider_transaction_id: dto.provider_transaction_id,
    //             payment_intent_id: dto.payment_intent_id,
    //             payment_method_id: dto.payment_method_id,
    //             metadata: dto.metadata
    //         };

    //         const transaction = new PaymentTransaction(transactionData);
    //         await transaction.validate();
    //         return transaction;
    //     } catch (error: any) {
    //         console.error('PaymentTransaction Object creation: ', {
    //             message: error.message,
    //             stack: error.stack
    //         });
    //         throw error;
    //     }
    // }

    // static async updateFromDTO(existingTransaction: IPaymentTransaction, dto: UpdatePaymentTransactionDTO): Promise<Partial<IPaymentTransaction>> {
    //     try {
    //         // Only include fields that are actually being updated
    //         const transactionData: Partial<IPaymentTransaction> = {
    //             _id: existingTransaction._id, // Keep the ID for reference
    //             ...dto,
    //         };

    //         const transaction = new PaymentTransaction(transactionData);
    //         await transaction.validateForUpdate();
    //         return transactionData;
    //     } catch (error: any) {
    //         console.error('PaymentTransaction Object update: ', {
    //             message: error.message,
    //             stack: error.stack
    //         });
    //         throw error;
    //     }
    // }

    // static createRefund(originalTransaction: IPaymentTransaction, refundAmount: number): PaymentTransaction {
    //     try {
    //         const refundData: Partial<IPaymentTransaction> = {
    //             user_id: originalTransaction.user_id,
    //             session_id: originalTransaction.session_id,
    //             amount: refundAmount,
    //             currency: originalTransaction.currency,
    //             status: PaymentTransactionStatus.PENDING,
    //             type: PaymentTransactionType.REFUND,
    //             provider: originalTransaction.provider,
    //             provider_transaction_id: null,
    //             payment_intent_id: originalTransaction.payment_intent_id,
    //             payment_method_id: originalTransaction.payment_method_id,
    //             metadata: {
    //                 original_transaction_id: originalTransaction._id,
    //                 ...originalTransaction.metadata
    //             }
    //         };

    //         return new PaymentTransaction(refundData);
    //     } catch (error: any) {
    //         console.error('PaymentTransaction Refund creation: ', {
    //             message: error.message,
    //             stack: error.stack
    //         });
    //         throw error;
    //     }
    // }

    // private async validate(): Promise<void> {
    //     // Validation for creation
    //     if (!this.user_id) {
    //         throw new ValidationError('User ID is required');
    //     }

    //     if (!this.session_id) {
    //         throw new ValidationError('Session ID is required');
    //     }

    //     if (this.amount <= 0) {
    //         throw new ValidationError('Amount must be greater than zero');
    //     }

    //     if (!this.currency) {
    //         throw new ValidationError('Currency is required');
    //     }

    //     // Status validation
    //     const validStatuses = Object.values(PaymentTransactionStatus);
    //     if (!validStatuses.includes(this.status as PaymentTransactionStatus)) {
    //         throw new ValidationError('Invalid transaction status');
    //     }

    //     // Type validation
    //     const validTypes = Object.values(PaymentTransactionType);
    //     if (!validTypes.includes(this.type as PaymentTransactionType)) {
    //         throw new ValidationError('Invalid transaction type');
    //     }

    //     if (!this.provider) {
    //         throw new ValidationError('Payment provider is required');
    //     }
    // }

    // private async validateForUpdate(): Promise<void> {
    //     // Validation for updates - less strict than creation validation
    //     if (this.amount !== undefined && this.amount <= 0) {
    //         throw new ValidationError('Amount must be greater than zero');
    //     }

    //     if (this.status) {
    //         const validStatuses = Object.values(PaymentTransactionStatus);
    //         if (!validStatuses.includes(this.status as PaymentTransactionStatus)) {
    //             throw new ValidationError('Invalid transaction status');
    //         }
    //     }

    //     if (this.type) {
    //         const validTypes = Object.values(PaymentTransactionType);
    //         if (!validTypes.includes(this.type as PaymentTransactionType)) {
    //             throw new ValidationError('Invalid transaction type');
    //         }
    //     }
    // }
}