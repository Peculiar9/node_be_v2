export interface EmailVerificationResult {
    success: boolean;
    messageId: string;
    verificationToken: string;
    expiresAt: Date;
    message?: string;
    error?: string;
}

export interface SendEmailOptions {
    to: string;
    subject: string;
    templateId?: string;
    dynamicTemplateData?: Record<string, any>;
    htmlContent?: string;
    textContent?: string;
}

export interface ITwilioEmailService {
    /**
     * Send email verification using Twilio SendGrid Dynamic Template
     * @param email User's email address
     * @param firstName User's first name for personalization
     * @returns Verification result with token for later verification
     */
    sendEmailVerification(
        email: string, 
        firstName: string
    ): Promise<EmailVerificationResult>;

    /**
     * Verify email verification token
     * @param email User's email address
     * @param token Verification token from email
     * @returns Verification result
     */
    verifyEmailToken(email: string, token: string): Promise<{
        success: boolean;
        message: string;
    }>;

    /**
     * Send general email using SendGrid
     * @param options Email options
     * @returns Send result
     */
    sendEmail(options: SendEmailOptions): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
