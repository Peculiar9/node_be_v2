import { UserResponseDTO } from './UserDTO';

/**
 * DTO for email verification result
 */
export class VerifyEmailResultDTO {
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
}

/**
 * DTO for verification info
 */
export class VerificationInfoDTO {
    email_verified: boolean;
    phone_verified: boolean;
    verification_method: string;
    verification_reference?: string;
}

/**
 * DTO for onboarding progress response
 */
export class OnboardingProgressResponseDTO {
    user_id: string;
    current_stage: string;
    completed_stages: string[];
    pending_stages: string[];
    completion_percentage: number;
    email_verified: boolean;
    phone_verified: boolean;
    business_info_completed: boolean;
    identity_verified: boolean;
    certificates_uploaded: boolean;
    license_uploaded: boolean;
}

/**
 * DTO for registration initialization result
 */
export class InitializeRegistrationResultDTO {
    user: UserResponseDTO;
    onboardingProgress: any; // IOnboardingProgress entity
    verificationInfo: {
        email_sent: boolean;
        expires_at: string;
        next_step: string;
        message?: string;
    };
}

/**
 * DTO for email verification with OTP result
 */
export class VerifyEmailWithOTPResultDTO {
    accessToken: string;
    refreshToken: string;
    user: any; // IUser entity - will be mapped to UserResponseDTO in controller
    onboardingProgress: any; // IOnboardingProgress entity
}

/**
 * DTO for business data input
 */
export class BusinessDataDTO {
    business_name: string;
    business_type: string;
    years_of_experience: string;
}

/**
 * DTO for identity data input
 */
export class IdentityDataDTO {
    document_type: string;
    document_number: string;
    document_file_url: string;
}

/**
 * DTO for business verification completion result
 */
export class CompleteBusinessVerificationResultDTO {
    accessToken: string;
    refreshToken: string;
    user: any; // IUser entity
    business: any; // IBusiness entity
    document: any; // IDocument entity
    onboardingProgress: any; // IOnboardingProgress entity
}

/**
 * DTO for verification attempt completion result
 */
export class VerificationAttemptResultDTO {
    verification_attempt_completed: boolean;
    verification_status: string;
    onboarding_stage: string;
    next_step: string;
    message: string;
}

/**
 * DTO for document response
 */
export class DocumentResponseDTO {
    id: string;
    document_type: string;
    document_url: string;
    status: string;
    uploaded_at: string;
}

/**
 * DTO for upload certificates result
 */
export class UploadCertificatesResultDTO {
    documents: DocumentResponseDTO[];
    onboarding_progress: OnboardingProgressResponseDTO;
    message: string;
}

/**
 * DTO for upload license result
 */
export class UploadLicenseResultDTO {
    document: DocumentResponseDTO;
    onboarding_progress: OnboardingProgressResponseDTO;
    message: string;
}
