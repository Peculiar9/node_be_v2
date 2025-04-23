import { IVerification } from "../Entities/auth-and-user/IVerification";

export interface IOTPService {  
    createOtpInstance(otp: string, salt: string): Promise<IVerification>;
    updateOtpInstance(verificationId: string, otp: string, salt: string): Promise<IVerification>;
    validOTP(code: string, token: string, salt: string): Promise<void>;
}