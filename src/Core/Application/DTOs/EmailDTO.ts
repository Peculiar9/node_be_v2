export interface EmailOTPDTO {
    email: string;
    firstName?: string;
    userId?: string;
    otpCode?: string;
    otpExpiry?: number;
    attempts?: number;
    lastAttempt?: number;
    purpose?: string; // Indicates the purpose of the OTP (e.g., 'password reset', 'verification')
}

export interface EmailVerificationResponse {
    success: boolean;
    message: string;
    reference?: string;
    expiry?: number;
    remainingAttempts?: number;
}
