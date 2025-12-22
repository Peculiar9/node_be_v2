import { APP_NAME, TYPES } from "../../Core/Types/Constants";
import crypto from 'crypto';
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { IEmailService } from "../../Core/Application/Interface/Services/IEmailService";
import { IAWSHelper } from "../../Core/Application/Interface/Services/IAWSHelper";
import { inject, injectable } from "inversify";
import { EmailOTPDTO, EmailVerificationResponse } from "../../Core/Application/DTOs/EmailDTO";
import { VerificationType } from "../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";
import { UtilityService } from "../../Core/Services/UtilityService";
import { ValidationError } from "../../Core/Application/Error/AppError";

@injectable()
export class EmailService implements IEmailService {
    constructor(
        @inject(TYPES.AWSHelper) private readonly _awsHelper: IAWSHelper,
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository,
        @inject(TYPES.TransactionManager) private readonly transactionManager: TransactionManager
    ) { }

    async sendOTPEmail(data: EmailOTPDTO): Promise<EmailVerificationResponse> {
        try {
            if (!UtilityService.isValidEmail(data.email)) {
                throw new ValidationError('Invalid email format');
            }

            const otp = data.otpCode as string;
            const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes

            const reference = UtilityService.generateUUID();

            // NOTE: OTP verification data is stored in onboarding_progress.stage_data
            // NOT in the verifications table

            const userName = data.firstName || data.email.split('@')[0];
            const emailData = {
                recipient: data.firstName || data.email,
                ...data,
                otpCode: otp,
                otpExpiry: 15, // minutes
                userName
            };
            await this._awsHelper.sendOTPEmail(data.email, emailData);

            return {
                success: true,
                message: 'OTP sent successfully',
                reference: reference,
                expiry,
                remainingAttempts: 3,
                code: otp // Return the OTP code so caller can store it
            };
        } catch (error: any) {
            console.error('EmailService::sendOTPEmail -> Failed', {
                error: error.message,
                email: data.email
            });
            throw new Error(error.message);
        }
    }

    async sendPasswordResetOTPEmail(data: EmailOTPDTO): Promise<EmailVerificationResponse> {
        let transactionStarted = false;
        try {
            if (!UtilityService.isValidEmail(data.email)) {
                throw new ValidationError('Invalid email format');
            }

            const otp = data.otpCode as string;
            const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes

            const reference = UtilityService.generateUUID();

            const verification = await this.verificationRepository.create({
                identifier: data.email,
                type: VerificationType.EMAIL,
                otp: {
                    code: await UtilityService.hashOTP(otp),
                    attempts: 0,
                    expiry: UtilityService.dateToUnix(expiry),
                    last_attempt: null,
                    verified: false
                },
                user_id: data.userId,
                expiry: UtilityService.dateToUnix(expiry),
                reference
            });

            const userName = data.firstName || data.email.split('@')[0];
            const emailData = {
                recipient: data.email,
                ...data,
                otpCode: otp,
                otpExpiry: 15, // minutes
                userName,
                CompanyName: APP_NAME
            };

            await this._awsHelper.sendPasswordResetOTPEmail(data.email, emailData);

            return {
                success: true,
                message: 'Password reset OTP sent successfully',
                reference: verification.reference,
                expiry,
                remainingAttempts: 3
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async resendOTPEmail(email: string, reference: string): Promise<EmailVerificationResponse> {
        try {
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== email) {
                throw new ValidationError('Invalid verification reference');
            }

            if (verification.otp?.last_attempt) {
                const timeSinceLastAttempt = Date.now() - verification.otp.last_attempt;
                if (timeSinceLastAttempt < 60000) { // 1 minute
                    throw new ValidationError('Please wait before requesting another OTP');
                }
            }

            const otp = UtilityService.generateOTP();
            const expiry = Date.now() + (15 * 60 * 1000);

            await this.verificationRepository.update(verification._id!, {
                otp: {
                    code: await UtilityService.hashOTP(otp),
                    attempts: 0,
                    expiry,
                    last_attempt: Date.now(),
                    verified: false
                },
                expiry
            });

            await this._awsHelper.sendOTPEmail(email, {
                recipient: email,
                email,
                otpCode: otp,
                otpExpiry: 15
            });

            return {
                success: true,
                message: 'OTP resent successfully',
                reference: verification.reference,
                expiry,
                remainingAttempts: 3
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async verifyOTPEmail(email: string, otp: string, reference: string): Promise<EmailVerificationResponse> {
        try {
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== email) {
                throw new ValidationError('Invalid verification reference');
            }

            if (verification.expiry! < Date.now()) {
                throw new ValidationError('OTP has expired');
            }

            if (verification.otp!.attempts >= 3) {
                throw new ValidationError('Maximum attempts exceeded');
            }

            const isValid = await UtilityService.verifyOTP(otp, verification.otp!.code);

            const attempts = verification.otp!.attempts + 1;
            await this.verificationRepository.update(verification._id!, {
                otp: {
                    ...verification.otp!,
                    attempts,
                    last_attempt: Date.now(),
                    verified: isValid
                }
            });

            if (!isValid) {
                throw new ValidationError('Invalid OTP');
            }

            return {
                success: true,
                message: 'OTP verified successfully',
                reference: verification.reference
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }
    async sendVerificationEmail(data: any, userSalt: string, next: string): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendVerificationEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendPasswordResetEmail(data: EmailOTPDTO): Promise<any> {
        try {
            const emailData = {
                recipient: data.email,
                ...data,
                otpCode: data.otpCode,
                otpExpiry: 15,
                userName: data.firstName || data.email.split('@')[0],
                CompanyName: APP_NAME
            };
            const emailResult = await this._awsHelper.sendForgotPasswordEmail(data.email, emailData);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendWelcomeEmail(data: any): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendWaitlistEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendProfileUpdateEmail(data: any): Promise<any> {
        try {
            const emailResult = await this._awsHelper.sendProfileUpdateEmail(data.email, data);
            return emailResult;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }
}