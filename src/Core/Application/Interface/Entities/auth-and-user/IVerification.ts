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

export interface IUserKYC {
  _id?: string;
  user_id: string;
  current_stage: KYCStage;
  status: KYCStatus;
  last_updated: Date | string;
  failure_reason?: string | null;
  stage_metadata: Record<string, any>;
}


export enum KYCStage {
    EMAIL_VERIFICATION = 'email-verification',
    PHONE_VERIFICATION = 'phone-verification',
    FACE_UPLOAD = 'face-upload',
    LICENSE_UPLOAD = 'license-upload',
    FACE_COMPARISON = 'face-comparison',
    DETAILS_VERIFICATION = 'details-verification',
    PAYMENT_METHOD = 'payment-method',
    COMPLETED = 'completed'
  }
  
  export enum KYCStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    FAILED = 'failed'
  }