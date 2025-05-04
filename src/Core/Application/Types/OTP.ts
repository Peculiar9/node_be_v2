export interface OTP {
    code: string;
    attempts: number;
    expiry: number;
    last_attempt?: number | null;
    verified: boolean;
} 