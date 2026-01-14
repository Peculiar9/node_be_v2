import { IPaymentMethod, PaymentMethodStatus, PaymentMethodType } from '../Interface/Entities/payment/IPaymentMethod';
import { Column, CompositeIndex, ForeignKey, Index } from '@extensions/decorators';
import { ValidationError } from '../Error/AppError';
import { TableNames } from '../Enums/TableNames';

@CompositeIndex(['user_id', 'provider'])
export class PaymentMethod implements IPaymentMethod {
    @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    public _id?: string;

    @Index({ unique: false })
    @ForeignKey({
        constraint: 'fk_payment_method_user_id',
        table: TableNames.USERS,
        field: '_id'
    })
    @Column('VARCHAR(255) NOT NULL')
    public user_id: string;

    @Column('VARCHAR(50) NOT NULL')
    public type: PaymentMethodType | string;

    @Column('VARCHAR(50) NOT NULL')
    public provider: string;

    @Index({ unique: true })
    @Column('VARCHAR(255) NOT NULL')
    public provider_payment_method_id: string;

    @Column('VARCHAR(50) NOT NULL DEFAULT \'active\'')
    public status: PaymentMethodStatus | string;

    @Column('BOOLEAN DEFAULT false')
    public is_default: boolean;

    @Column('VARCHAR(255) DEFAULT NULL')
    public nickname?: string;

    @Column('VARCHAR(4) DEFAULT NULL')
    public last_four?: string;

    @Column('INTEGER DEFAULT NULL')
    public expiry_month?: number;

    @Column('INTEGER DEFAULT NULL')
    public expiry_year?: number;

    @Column('VARCHAR(50) DEFAULT NULL')
    public card_brand?: string;

    @Column('JSONB DEFAULT NULL')
    public billing_details?: {
        address?: {
            city?: string;
            country?: string;
            line1?: string;
            line2?: string;
            postal_code?: string;
            state?: string;
        };
        email?: string;
        name?: string;
        phone?: string;
    };

    @Column('JSONB DEFAULT NULL')
    public metadata?: Record<string, any>;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public created_at: Date | string;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public updated_at: Date | string;

    private constructor(data: Partial<IPaymentMethod>) {
        Object.assign(this, data);
    }

    static create(data: Partial<IPaymentMethod>): PaymentMethod {
        try {
            const paymentMethod = new PaymentMethod(data);
            paymentMethod.validate();
            return paymentMethod;
        } catch (error: any) {
            console.error('PaymentMethod Object creation: ', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    static createCreditCard(
        userId: string,
        provider: string,
        providerPaymentMethodId: string,
        cardBrand: string,
        lastFour: string,
        expiryMonth: number,
        expiryYear: number,
        isDefault: boolean = false,
        billingDetails?: any,
        nickname?: string
    ): PaymentMethod {
        return PaymentMethod.create({
            user_id: userId,
            type: PaymentMethodType.CREDIT_CARD,
            provider,
            provider_payment_method_id: providerPaymentMethodId,
            status: PaymentMethodStatus.ACTIVE,
            is_default: isDefault,
            nickname,
            last_four: lastFour,
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            card_brand: cardBrand,
            billing_details: billingDetails,
        });
    }

    static createBankAccount(
        userId: string,
        provider: string,
        providerPaymentMethodId: string,
        lastFour: string,
        isDefault: boolean = false,
        billingDetails?: any,
        nickname?: string
    ): PaymentMethod {
        return PaymentMethod.create({
            user_id: userId,
            type: PaymentMethodType.BANK_ACCOUNT,
            provider,
            provider_payment_method_id: providerPaymentMethodId,
            status: PaymentMethodStatus.ACTIVE,
            is_default: isDefault,
            nickname,
            last_four: lastFour,
            billing_details: billingDetails,
        });
    }

    static createDigitalWallet(
        userId: string,
        provider: string,
        providerPaymentMethodId: string,
        walletType: string,
        isDefault: boolean = false,
        billingDetails?: any,
        nickname?: string
    ): PaymentMethod {
        return PaymentMethod.create({
            user_id: userId,
            type: PaymentMethodType.DIGITAL_WALLET,
            provider,
            provider_payment_method_id: providerPaymentMethodId,
            status: PaymentMethodStatus.ACTIVE,
            is_default: isDefault,
            nickname,
            card_brand: walletType, // Using card_brand to store wallet type (Apple Pay, Google Pay, etc.)
            billing_details: billingDetails,
        });
    }

    static update(existingPaymentMethod: IPaymentMethod, data: Partial<IPaymentMethod>): Partial<IPaymentMethod> {
        try {
            // Only include fields that are actually being updated
            const updateData: Partial<IPaymentMethod> = {
                _id: existingPaymentMethod._id, // Keep the ID for reference
                ...data,
            };

            const paymentMethod = new PaymentMethod(updateData);
            paymentMethod.validateForUpdate();
            return updateData;
        } catch (error: any) {
            console.error('PaymentMethod Object update: ', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    setAsDefault(): void {
        this.is_default = true;
    }

    deactivate(): void {
        this.status = PaymentMethodStatus.INACTIVE;
    }

    markAsExpired(): void {
        this.status = PaymentMethodStatus.EXPIRED;
    }

    markAsFailed(): void {
        this.status = PaymentMethodStatus.FAILED;
    }

    private validate(): void {
        // Validation for creation
        if (!this.user_id) {
            throw new ValidationError('User ID is required');
        }

        if (!this.provider) {
            throw new ValidationError('Payment provider is required');
        }

        if (!this.provider_payment_method_id) {
            throw new ValidationError('Provider payment method ID is required');
        }

        if (!this.type) {
            throw new ValidationError('Payment method type is required');
        }

        // Type validation
        const validTypes = Object.values(PaymentMethodType);
        if (!validTypes.includes(this.type as PaymentMethodType)) {
            throw new ValidationError('Invalid payment method type');
        }

        // Status validation
        if (this.status) {
            const validStatuses = Object.values(PaymentMethodStatus);
            if (!validStatuses.includes(this.status as PaymentMethodStatus)) {
                throw new ValidationError('Invalid payment method status');
            }
        }

        // Type-specific validations
        if ((this.type === PaymentMethodType.CREDIT_CARD || this.type === PaymentMethodType.DEBIT_CARD) && 
            (!this.last_four || !this.expiry_month || !this.expiry_year || !this.card_brand)) {
            throw new ValidationError('Card details are required for credit/debit card payment methods');
        }

        if (this.type === PaymentMethodType.BANK_ACCOUNT && !this.last_four) {
            throw new ValidationError('Last four digits are required for bank account payment methods');
        }
    }

    private validateForUpdate(): void {
        // Validation for updates - less strict than creation validation
        if (this.type) {
            const validTypes = Object.values(PaymentMethodType);
            if (!validTypes.includes(this.type as PaymentMethodType)) {
                throw new ValidationError('Invalid payment method type');
            }
        }

        if (this.status) {
            const validStatuses = Object.values(PaymentMethodStatus);
            if (!validStatuses.includes(this.status as PaymentMethodStatus)) {
                throw new ValidationError('Invalid payment method status');
            }
        }

        // Type-specific validations for updates
        if (this.type === PaymentMethodType.CREDIT_CARD || this.type === PaymentMethodType.DEBIT_CARD) {
            if (this.expiry_month !== undefined && (this.expiry_month < 1 || this.expiry_month > 12)) {
                throw new ValidationError('Expiry month must be between 1 and 12');
            }
            
            if (this.expiry_year !== undefined) {
                const currentYear = new Date().getFullYear();
                if (this.expiry_year < currentYear) {
                    throw new ValidationError('Expiry year cannot be in the past');
                }
            }
        }
    }
}
