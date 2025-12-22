export interface IVerifyMeService {
    verifyNIN(nin: string, data: NINVerificationData): Promise<NINVerificationResult>;
    verifyNINByPhone(phone: string, data: NINVerificationData): Promise<NINVerificationResult>;
    verifyBVN(bvn: string, data: BVNVerificationData, type?: 'basic' | 'premium'): Promise<BVNVerificationResult>;
    verifyTIN(tin: string): Promise<TINVerificationResult>;
}

export interface NINVerificationData {
    firstname: string;
    lastname: string;
    dob: string; // Format: DD-MM-YYYY
}

export interface BVNVerificationData {
    firstname: string;
    lastname: string;
    dob: string; // Format: DD-MM-YYYY
}

export interface NINVerificationResult {
    verified: boolean;
    status: 'success' | 'error';
    message: string;
    data?: {
        nin?: string;
        firstname?: string;
        lastname?: string;
        middlename?: string;
        phone?: string;
        gender?: string;
        birthdate?: string;
        photo?: string;
        fieldMatches?: {
            firstname: boolean;
            lastname: boolean;
            dob: boolean;
        };
    };
}

export interface BVNVerificationResult {
    verified: boolean;
    status: 'success' | 'error';
    message: string;
    data?: {
        bvn?: string;
        firstname?: string;
        lastname?: string;
        middlename?: string;
        phone?: string;
        gender?: string;
        birthdate?: string;
        photo?: string;
        maritalStatus?: string;
        lgaOfResidence?: string;
        lgaOfOrigin?: string;
        residentialAddress?: string;
        stateOfOrigin?: string;
        enrollmentBank?: string;
        enrollmentBranch?: string;
        nameOnCard?: string;
        title?: string;
        levelOfAccount?: string;
        fieldMatches?: {
            firstname: boolean;
            lastname: boolean;
            dob: boolean;
        };
    };
}

export interface TINVerificationResult {
    verified: boolean;
    status: 'success' | 'error';
    message: string;
    data?: {
        tin?: string;
        taxpayerName?: string;
        cacRegNo?: string;
        entityType?: string;
        jittin?: string;
        taxOffice?: string;
        phone?: string;
        email?: string;
    };
}
