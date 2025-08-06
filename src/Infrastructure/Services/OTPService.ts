import { inject, injectable } from "inversify";
import { IOTPService } from "../../Core/Application/Interface/Services/IOTPService";
import { TYPES } from "../../Core/Types/Constants";
import { IVerification } from "../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import  CryptoService from "../../Core/Services/CryptoService";
import { UtilityService } from "../../Core/Services/UtilityService";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { DatabaseIsolationLevel } from "../../Core/Application/Enums/DatabaseIsolationLevel";
import { AppError, AuthenticationError } from "../../Core/Application/Error/AppError";
import { VerificationStatus } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";

@injectable()
export class OTPService implements IOTPService {
  constructor(
    @inject(TYPES.VerificationRepository) private readonly _verificationRepository: VerificationRepository,
    @inject(TYPES.TransactionManager) private readonly _transactionManager: TransactionManager,
  ) {}


    public async createOtpInstance(otp: string, salt: string): Promise<IVerification> {
        try {

            await this._transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            const verification = {
                otp: {
                    code: CryptoService.hashString(otp, salt),
                    expiry: UtilityService.dateToUnix(new Date(Date.now() + 10 * 60 * 1000)), //expires in 10mins
                    attempts: 0,
                    lastAttempt: UtilityService.dateToUnix(new Date()) || null,
                    verified: false
                },
                reference: UtilityService.generateUUID()
            }
            console.log("OTPService::createOtpInstance() => Verification: ", verification);
            const result: IVerification = await this._verificationRepository.create({
                user_id: undefined,
                otp: {
                    code: await CryptoService.hashString(otp, salt),
                    expiry: UtilityService.dateToUnix(new Date(Date.now() + 10 * 60 * 1000)), //expires in 10mins
                    attempts: 0,
                    last_attempt: UtilityService.dateToUnix(new Date()) || null,
                    verified: false
                },
                reference: UtilityService.generateUUID()
            }) as IVerification;
            await this._transactionManager.commit();
            return result;
        } catch (error: any) {
            console.log("OTPService::createOtpInstance() => Error: ", error.message);
            throw new AppError("Failed to create OTP instance");
        }
    }

public async updateOtpInstance(verificationId: string, otp: string, salt: string): Promise<IVerification> {
    // try {
    //     await this._transactionManager.beginTransaction({
    //         isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
    //     });
    //     console.log("OTP Code: ", otp);
    //     // Get the current verification record to check attempts
    //     const currentVerification = await this._verificationRepository.findById(verificationId);
    //     if (!currentVerification) {
    //         throw new Error('Verification record not found');
    //     }
    //     const code = CryptoService.hashString(otp, salt);
    //     const result: Verification = await this._verificationRepository.updateOtpInstance(verificationId, otp, salt, code) as Verification;   
    //     await this._transactionManager.commit();
    //     return result;
    // } catch (error: any) {
    //     await this._transactionManager.rollback();
    //     throw new Error(error.message);
    //     }
        throw new Error("Method not implemented.");
    }       

    public async validOTP(code: string, token: string, salt: string): Promise<any> {
        try {
            await this._transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            // Get verification record by token
            const verification = await this._verificationRepository.findByToken(token);
            
            if (!verification) {
                await this._transactionManager.rollback();
                throw new AuthenticationError("Verification not found");
            }

            // Hash the provided code with salt for comparison
            const hashedToken = CryptoService.hashString(code, salt);
            
            // Get stored OTP code and expiry
            const storedOTPCode = verification.otp?.code;
            const expiryTime = verification.otp?.expiry;
            const currentTime = Date.now();

            // Check if OTP has expired
            if (!expiryTime || currentTime > expiryTime) {
                // Update verification status to expired
                await this._verificationRepository.updateVerification(verification._id as string, {
                    status: VerificationStatus.EXPIRED
                });
                await this._transactionManager.rollback();
                throw new AuthenticationError(ResponseMessage.FAILED_PHONE_VERIFICATION_MESSAGE);
            }

            // Validate OTP code
            if (!storedOTPCode || hashedToken !== storedOTPCode) {
                // Update verification attempts
                const attempts = (verification.otp?.attempts || 0) + 1;
                await this._verificationRepository.updateVerification(verification._id as string, {
                    otp: {
                        ...verification.otp,
                        attempts,
                        lastAttempt: currentTime
                    }
                });
                await this._transactionManager.rollback();
                throw new AuthenticationError("Invalid verification or expired OTP");
            }

            // Update verification status to verified
            await this._verificationRepository.updateVerification(verification._id as string, {
                status: VerificationStatus.VERIFIED,
                otp: {
                    ...verification.otp,
                    verified: true
                }
            });
            
            await this._transactionManager.commit();
            return true;
        } catch (error) {
            await this._transactionManager.rollback();
            if (error instanceof AuthenticationError) {
                throw error;
            }
            console.error("OTPService::validOTP error: ", error);
            throw new AuthenticationError("Failed to validate OTP");
        }
    }
}
