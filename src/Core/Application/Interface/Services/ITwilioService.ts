export interface TwilioMessageOptions {
    from?: string;
    statusCallback?: string;
    messagingServiceSid?: string;
}

export interface TwilioVerificationOptions {
    channel: 'sms' | 'whatsapp' | 'call';
    locale?: string;
}

export interface TwilioMessageResponse {
    sid: string;
    status: string;
    dateCreated: Date;
    dateUpdated: Date;
    to: string;
    from: string;
    body: string;
    errorCode?: string;
    errorMessage?: string;
    success: boolean;
}

export interface TwilioVerificationResponse {
    sid: string;
    status: string;
    to: string;
    channel: string;
    valid: boolean;
    dateCreated: Date;
    lookup?: {
        carrier?: {
            name?: string;
            type?: string;
        }
    };
}

export interface ITwilioService {
    /**
     * Send an SMS message
     * @param to Phone number in E.164 format
     * @param body Message content
     * @param options Additional options
     */
    sendSMS(to: string, body: string, options?: TwilioMessageOptions): Promise<TwilioMessageResponse>;
    
    /**
     * Send a WhatsApp message
     * @param to Phone number in E.164 format
     * @param body Message content
     * @param options Additional options
     */
    sendWhatsApp(to: string, body: string, options?: TwilioMessageOptions): Promise<TwilioMessageResponse>;
    
    /**
     * Start verification process by sending an OTP
     * @param to Phone number in E.164 format
     * @param options Verification options
     */
    startVerification(to: string, options: TwilioVerificationOptions): Promise<{
        sid: string;
        status: string;
        to: string;
        valid: boolean;
        channel: string;
    }>;
    
    /**
     * Check verification code
     * @param to Phone number in E.164 format
     * @param code Verification code
     */
    checkVerification(to: string, code: string): Promise<{
        sid: string;
        status: string;
        valid: boolean;
    }>;
}
