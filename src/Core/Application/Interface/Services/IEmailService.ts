import { EmailOTPDTO, EmailVerificationResponse } from '../../DTOs/EmailDTO';

export interface IEmailService {
    sendVerificationEmail(data: any, userSalt: string, next: string): Promise<any>;
    sendPasswordResetEmail(data: any): Promise<any>;
    sendWelcomeEmail(data: any): Promise<any>;
    sendProfileUpdateEmail(data: any): Promise<any>;
    
    // OTP related methods
    sendOTPEmail(data: EmailOTPDTO): Promise<EmailVerificationResponse>;
    sendPasswordResetOTPEmail(data: EmailOTPDTO): Promise<EmailVerificationResponse>;
    resendOTPEmail(email: string, reference: string): Promise<EmailVerificationResponse>;
    verifyOTPEmail(email: string, otp: string, reference: string): Promise<EmailVerificationResponse>;
}
