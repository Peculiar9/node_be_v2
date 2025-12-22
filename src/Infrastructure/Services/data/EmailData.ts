export interface EmailData {
    recipient: string;
    firstName?: string;
    email?: string;
    guid?: string;
    token?: string;
    validity?: number;
    verificationUrl?: string;
    userName?: string;
    otpCode?: string;
    otpExpiry?: number;
    CompanyName?: string;
}