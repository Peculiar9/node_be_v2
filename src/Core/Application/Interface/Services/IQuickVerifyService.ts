export interface IQuickVerifyService {
    verifyNIN(nin: string): Promise<NINVerificationResult>;
    verifyNINByPhone(phone: string): Promise<NINVerificationResult>;
    verifyNINByDemographics(data: DemographicData): Promise<NINVerificationResult>;
    verifyNINByTrackingId(tid: string): Promise<NINVerificationResult>;
    verifyTIN(tin: string): Promise<TINVerificationResult>;
}

export interface DemographicData {
    firstname: string;
    lastname: string;
    gender: string;
    dob: string;
}

export interface NINVerificationResult {
    verified: boolean;
    response_code: '00' | '01' | '02';
    message: string;
    data?: {
        nin?: string;
        firstname?: string;
        lastname?: string;
        middlename?: string;
        gender?: string;
        dob?: string;
        phone?: string;
        email?: string;
        address?: string;
        photo?: string;
    };
}

export interface TINVerificationResult {
    verified: boolean;
    response_code: '00' | '01' | '02';
    message: string;
    data?: {
        tin?: string;
        company_name?: string;
        tax_office?: string;
        registration_date?: string;
        taxpayer_name?: string;
    };
}
