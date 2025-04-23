import { OTP } from '../../../Types/OTP';
import { VerificationStatus } from './IUser';

export interface IVerification {
    _id?: string;
    user_id: string | undefined;
    type?: VerificationType | string;
    identifier?: string;
    reference: string;
    otp?: OTP;
    status?: VerificationStatus | string;
    expiry?: number;
    created_at?: string;
    updated_at?: string;
}

export enum VerificationType {
    PHONE = 'phone',
    EMAIL = 'email',
    OAUTH = 'oauth',
}
