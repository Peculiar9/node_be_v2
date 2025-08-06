import { TYPES } from "../../Core/Types/Constants";
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
    ) {}

    async sendOTPEmail(data: EmailOTPDTO): Promise<EmailVerificationResponse> {
        let transactionStarted = false;
        try {
            // await this.transactionManager.beginTransaction();
            // transactionStarted = true;
            // Validate email format
            if (!UtilityService.isValidEmail(data.email)) {
                throw new ValidationError('Invalid email format');
            }

            // Generate OTP
            const otp = data.otpCode as string;
            const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes

            // Generate UUID for reference
            const reference = UtilityService.generateUUID();

            // Create verification record
            const verification = await this.verificationRepository.create({
                identifier: data.email,
                type: VerificationType.EMAIL,
                otp: {
                    code: await UtilityService.hashOTP(otp),
                    attempts: 0,
                    expiry,
                    last_attempt: null,
                    verified: false
                },
                user_id: data.userId,
                expiry,
                reference
            });

            // Send email with OTP
            const userName = data.email.split('@')[0]; // Extract username from email
            const emailData = {
                recipient: data.firstName || data.email,
                ...data,
                otpCode: otp,
                otpExpiry: 15, // minutes
                userName // Add userName for template
            };
            await this._awsHelper.sendOTPEmail(data.email, emailData);

            // await this.transactionManager.commit();
            
            return {
                success: true,
                message: 'OTP sent successfully',
                reference: verification.reference,
                expiry,
                remainingAttempts: 3
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async sendPasswordResetOTPEmail(data: EmailOTPDTO): Promise<EmailVerificationResponse> {
        let transactionStarted = false;
        try {
            // Validate email format
            if (!UtilityService.isValidEmail(data.email)) {
                throw new ValidationError('Invalid email format');
            }

            // Generate OTP
            const otp = data.otpCode as string;
            const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes

            // Generate UUID for reference
            const reference = UtilityService.generateUUID();

            // Create verification record
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

            // Send email with OTP
            const userName = data.firstName || data.email.split('@')[0]; // Use provided userName or extract from email
            const emailData = {
                recipient: data.email,
                ...data,
                otpCode: otp,
                otpExpiry: 15, // minutes
                userName, // Add userName for template
                CompanyName: 'Gr33nWh33lz' // Add company name
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
            // Get existing verification
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== email) {
                throw new ValidationError('Invalid verification reference');
            }

            // Check rate limiting
            if (verification.otp?.last_attempt) {
                const timeSinceLastAttempt = Date.now() - verification.otp.last_attempt;
                if (timeSinceLastAttempt < 60000) { // 1 minute
                    throw new ValidationError('Please wait before requesting another OTP');
                }
            }

            // Generate new OTP
            const otp = UtilityService.generateOTP();
            const expiry = Date.now() + (15 * 60 * 1000);

            // Update verification
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

            // Send email
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
            // Get verification
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== email) {
                throw new ValidationError('Invalid verification reference');
            }

            // Check expiry
            if (verification.expiry! < Date.now()) {
                throw new ValidationError('OTP has expired');
            }

            // Check attempts
            if (verification.otp!.attempts >= 3) {
                throw new ValidationError('Maximum attempts exceeded');
            }

            // Verify OTP
            const isValid = await UtilityService.verifyOTP(otp, verification.otp!.code);
            
            // Update attempts
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
                CompanyName: 'Gr33nWh33lz'
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