import { injectable, inject } from "inversify";
import { TYPES } from "@Core/Types/Constants";
import { IAuthenticationService } from "@Core/Application/Interface/Services/IAuthenticationService";
import { LoginResponseDTO } from "@Core/Application/DTOs/AuthDTO";
import { AuthMethod, IUser, VerificationStatus } from "@Core/Application/Interface/Entities/auth-and-user/IUser";
import { VerificationType, IVerification } from "@Core/Application/Interface/Entities/auth-and-user/IVerification";
import { UserRepository } from "../Repository/SQL/users/UserRepository";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { Console, LogLevel } from "../Utils/Console";
import { AppError, AuthenticationError, ValidationError } from "@Core/Application/Error/AppError";
import { ResponseMessage } from "@Core/Application/Response/ResponseFormat";
import CryptoService from "@Core/Services/CryptoService";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { LinkedAccountsRepository } from "../Repository/SQL/auth/LinkedAccountsRepository";
import { EmailService } from "./EmailService";
import { SMSService } from "./SMSService";
import { UtilityService } from "@Core/Services/UtilityService";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";
import { EmailOTPDTO } from "@Core/Application/DTOs/EmailDTO";
import { BaseService } from "./base/BaseService";
import { AuthHelpers } from "./helpers/AuthHelpers";
import { TokenService } from "./TokenService";
import { EnvironmentConfig } from "../Config/EnvironmentConfig";
import { User } from "@Core/Application/Entities/User";


@injectable()
export class AuthenticationService extends BaseService implements IAuthenticationService {
    constructor(
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.LinkedAccountsRepository) private readonly linkedAccountsRepository: LinkedAccountsRepository,
        @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
        @inject(TYPES.EmailService) private readonly emailService: EmailService,
        @inject(TYPES.SMSService) private readonly smsService: SMSService,
        @inject(TYPES.AuthHelpers) private readonly authHelpers: AuthHelpers,
        @inject(TYPES.VerificationRepository) protected readonly verificationRepository: VerificationRepository,
        @inject(TYPES.TokenService) private readonly tokenService: TokenService,
    ) {
        super(transactionManager);
    }

    async authenticate(identifier: string, password: string): Promise<LoginResponseDTO | undefined> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            let user: IUser | undefined | null = null;
            if (identifier.includes('@')) {
                user = await this.userRepository.findByEmail(identifier);
            } else {
                user = await this.userRepository.findByPhone(identifier);
            }

            if (!user) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            const isPasswordValid = await CryptoService.verifyHash(password, user.password as string, user.salt as string);
            if (!isPasswordValid) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            const { refreshToken, accessToken } = await this.tokenService.generateTokens(user);
            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }

            return { accessToken, refreshToken, user: this.authHelpers.constructUserObject(user) };
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error during authentication, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new AuthenticationError("Authentication failed");
        }
    }

    async verifyToken(token: string): Promise<any> {
        return this.tokenService.verifyToken(token);
    }

    async refreshAccessToken(refreshToken: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            try {
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;
                const userId = decoded.sub as string;

                const user = await this.userRepository.findById(userId);
                if (!user) {
                    throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
                }

                if (!user.refresh_token) {
                    throw new AuthenticationError(ResponseMessage.INVALID_REFRESH_TOKEN);
                }

                const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refresh_token);

                if (!isRefreshTokenValid) {
                    throw new AuthenticationError(ResponseMessage.INVALID_REFRESH_TOKEN);
                }

                const tokens = await this.tokenService.generateTokens(user);

                if (transactionSuccessfullyStarted) {
                    await this.commitTransaction();
                }

                return { user, accessToken: tokens.accessToken, refreshToken: refreshToken };
            } catch (verifyError: any) {
                throw verifyError;
            }
        } catch (error: any) {

            if (transactionSuccessfullyStarted) {
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.INVALID_REFRESH_TOKEN);
        }
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            await this.userRepository.update(userId, { refresh_token: null });

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error revoking refresh token, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.INVALID_REFRESH_TOKEN);
        }
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            // Find user by email
            const user = await this.userRepository.findByEmail(email);

            // Even if user doesn't exist, we don't want to reveal that
            if (!user) {
                if (transactionSuccessfullyStarted) {
                    await this.commitTransaction();
                }
                return;
            }

            const resetToken = UtilityService.generate4Digit();

            const hashedToken = await UtilityService.hashToken(resetToken);


            const verification = await this.authHelpers.createEmailVerificationRecord(
                user._id as string,
                email,
                resetToken,
                user.salt as string
            );

            const otpCodeObject: EmailOTPDTO = {
                email: user.email as string,
                otpCode: resetToken,
                otpExpiry: 15,
                userId: user._id as string,
                purpose: 'password reset',
                firstName: user.first_name || user.email?.split('@')[0]
            };

            await this.emailService.sendPasswordResetEmail(otpCodeObject);

            await this.userRepository.update(user._id as string, {
                reset_token: verification.reference,
                reset_token_expires: verification.otp?.expiry || UtilityService.dateToUnix(new Date(Date.now() + 15 * 60 * 1000))
            });

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error requesting password reset, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.PASSWORD_RESET_REQUEST_FAILED);
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        throw new Error("Method not implemented");
    }

    async requestPasswordResetOTP(email: string): Promise<void> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            // Find user by email
            const user = await this.userRepository.findByEmail(email);

            // Even if user doesn't exist, we don't want to reveal that
            if (!user) {
                if (transactionSuccessfullyStarted) {
                    await this.commitTransaction();
                }
                return;
            }

            const otp = UtilityService.generate6Digit();
            const otpExpiry = new Date();
            otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

            const hashedOTP = await bcrypt.hash(otp, 10);

            await this.userRepository.update(user._id as string, {
                reset_token: hashedOTP,
                reset_token_expires: UtilityService.dateToUnix(otpExpiry)
            });

            const emailOTPData: EmailOTPDTO = {
                email: user.email as string,
                otpCode: otp,
                otpExpiry: 10,
                userId: user._id as string,
                purpose: 'password reset',
                firstName: user.first_name || user.email?.split('@')[0]
            };

            await this.emailService.sendPasswordResetOTPEmail(emailOTPData);

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error requesting password reset OTP, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.USER_PASSWORD_RESET_FAILED);
        }
    }

    async resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            const verification = await this.verificationRepository.findByReference(user.reset_token as string);
            if (!verification) {
                throw new ValidationError('No password reset request found or it has expired');
            }

            if (verification.type !== VerificationType.EMAIL || verification.identifier !== email) {
                throw new ValidationError('Invalid verification record');
            }
            if (verification.status === VerificationStatus.EXPIRED) {
                throw new ValidationError('Password reset request has expired. Please request a new code');
            }

            const currentTime = UtilityService.dateToUnix(new Date());
            if (!verification.otp || verification.otp.expiry < currentTime) {
                throw new ValidationError('OTP has expired. Please request a new code');
            }

            if (verification.otp.attempts >= 3) {
                throw new ValidationError('Maximum verification attempts exceeded. Please request a new code');
            }

            const hashedOtp = await CryptoService.hashString(otp, user.salt as string);

            if (!EnvironmentConfig.isProduction() && otp === '123456') {

            } else if (hashedOtp !== verification.otp.code) {
                await this.verificationRepository.update(verification._id as string, {
                    otp: {
                        ...verification.otp,
                        attempts: (verification.otp.attempts || 0) + 1,
                        last_attempt: currentTime
                    }
                });
                throw new ValidationError('Invalid OTP code');
            }

            const hashedPassword = await CryptoService.hashString(newPassword, user.salt as string);

            await this.userRepository.update(user._id as string, {
                password: hashedPassword,
                reset_token: null,
                reset_token_expires: null
            });

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }

            return true;
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error resetting password with OTP, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.USER_PASSWORD_RESET_FAILED);
        }
    }

    async validateUser(userId: string): Promise<IUser> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }
            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }
            return user;
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error validating user, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }
            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.USER_VALIDATION_FAILED);
        }
    }



    // =========================CONSOLIDATED APP AUTHENTICATION========================
    authenticateV2(identifier: string, password: string): Promise<LoginResponseDTO | undefined> {
        throw new Error("Method not implemented.");
    }
   

    /**
     * Generates both access and refresh tokens for a user
     * @param user User to generate tokens for
     * @returns Object containing accessToken and refreshToken
    */
    async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        // Use the implementation from TokenService
        return this.tokenService.generateTokens(user);
    }
}
