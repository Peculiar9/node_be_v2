export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_ACCOUNT = 'bank_account',
  DIGITAL_WALLET = 'digital_wallet'
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  FAILED = 'failed'
}

export interface IPaymentMethod {
  _id?: string;
  user_id: string;
  type: PaymentMethodType | string;
  provider: string; // 'stripe', 'paypal', etc.
  provider_payment_method_id: string; // External ID from the payment provider
  status: PaymentMethodStatus | string;
  is_default: boolean;
  nickname?: string; // User-defined name for this payment method
  last_four?: string; // Last four digits of card or account
  expiry_month?: number; // For cards
  expiry_year?: number; // For cards
  card_brand?: string; // Visa, Mastercard, etc.
  billing_details?: {
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
  metadata?: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
}
