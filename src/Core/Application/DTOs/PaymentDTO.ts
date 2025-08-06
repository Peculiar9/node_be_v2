import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for adding a payment method
 */
export class AddPaymentMethodDTO {
    @IsNotEmpty({ message: 'Payment method ID is required' })
    @IsString({ message: 'Payment method ID must be a string' })
    paymentMethodId: string;

    @IsOptional()
    @IsBoolean({ message: 'setAsDefault must be a boolean' })
    setAsDefault?: boolean;
}

/**
 * DTO for setting a payment method as default
 */
export class SetDefaultPaymentMethodDTO {
    @IsNotEmpty({ message: 'Payment method ID is required' })
    @IsString({ message: 'Payment method ID must be a string' })
    paymentMethodId: string;
}

/**
 * DTO for creating a payment intent
 */
export class CreatePaymentIntentDTO {
    @IsNotEmpty({ message: 'Amount is required' })
    amount: number;

    @IsOptional()
    @IsString({ message: 'Currency must be a string' })
    currency?: string;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description?: string;

    @IsOptional()
    @IsString({ message: 'Payment method ID must be a string' })
    paymentMethodId?: string;
}

/**
 * DTO for capturing a payment
 */
export class CapturePaymentDTO {
    @IsNotEmpty({ message: 'Payment intent ID is required' })
    @IsString({ message: 'Payment intent ID must be a string' })
    paymentIntentId: string;

    @IsOptional()
    amount?: number;
}

/**
 * DTO for refunding a payment
 */
export class RefundPaymentDTO {
    @IsNotEmpty({ message: 'Payment intent ID is required' })
    @IsString({ message: 'Payment intent ID must be a string' })
    paymentIntentId: string;

    @IsOptional()
    amount?: number;

    @IsOptional()
    @IsString({ message: 'Reason must be a string' })
    reason?: string;
}
