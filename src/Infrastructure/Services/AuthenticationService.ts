import { injectable, inject } from "inversify";
import { TYPES } from "../../Core/Types/Constants";
import { IAuthenticationService } from "../../Core/Application/Interface/Services/IAuthenticationService";
import { LoginResponseDTO } from "../../Core/Application/DTOs/AuthDTO";
import { AuthMethod, IUser, VerificationStatus } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { VerificationType, IVerification } from "../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { UserRepository } from "../Repository/SQL/users/UserRepository";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { Console, LogLevel } from "../Utils/Console";
import { AppError, AuthenticationError, ValidationError } from "../../Core/Application/Error/AppError";
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";
import CryptoService from "../../Core/Services/CryptoService";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { LinkedAccountsRepository } from "../Repository/SQL/auth/LinkedAccountsRepository";
import { CreateUserDTO, UserResponseDTO } from "../../Core/Application/DTOs/UserDTO";
import { EmailService } from "./EmailService";
import { SMSService } from "./SMSService";
import { UtilityService } from "../../Core/Services/UtilityService";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";
import { EmailOTPDTO } from "../../Core/Application/DTOs/EmailDTO";
import { BaseService } from "./base/BaseService";
import { AuthHelpers } from "./helpers/AuthHelpers";
import { TokenService } from "./TokenService";
import { EnvironmentConfig } from "../Config/EnvironmentConfig";
import { User } from "../../Core/Application/Entities/User";
import { AuthService } from "./AuthService";

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
        @inject(TYPES.AuthService) private readonly authService: AuthService,
    ) {
        super(transactionManager);
    }
    
    async authenticate(identifier: string, password: string): Promise<LoginResponseDTO | undefined> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            // Find user by email or phone
            let user: IUser | undefined | null = null;
            if (identifier.includes('@')) {
                user = await this.userRepository.findByEmail(identifier);
            } else {
                user = await this.userRepository.findByPhone(identifier);
            }
            
            if (!user) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }
            
            // Verify password
            const isPasswordValid = await CryptoService.verifyHash(password, user.password as string, user.salt as string);
            if (!isPasswordValid) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }
            
            // Generate tokens
            // const accessToken = this.generateAccessToken(user);
            // const refreshToken = await this.generateRefreshToken(user);
            
            const { refreshToken, accessToken } = await this.tokenService.generateTokens(user);
            console.log("Refresh Token From AuthenticationService->authenticate: ", refreshToken);
            console.log("Access Token From AuthenticationService->authenticate: ", accessToken);
            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }
            
            console.log("AccessToken, RefreshToken: ", accessToken, refreshToken);
            
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
            // // Debug environment info
            // Console.info({
            //     message: `[DEBUG] Refresh token flow started. Environment: ${process.env.NODE_ENV}`,
            //     level: LogLevel.INFO
            // });
            // Console.info({
            //     message: `[DEBUG] JWT_REFRESH_SECRET exists: ${!!process.env.JWT_REFRESH_SECRET}, Length: ${process.env.JWT_REFRESH_SECRET?.length || 0}`,
            //     level: LogLevel.INFO
            // });
            // Console.info({
            //     message: `[DEBUG] JWT_ACCESS_SECRET exists: ${!!process.env.JWT_ACCESS_SECRET}, Length: ${process.env.JWT_ACCESS_SECRET?.length || 0}`,
            //     level: LogLevel.INFO
            // });
            
            // Begin Transaction neatly
            transactionSuccessfullyStarted = await this.beginTransaction();
            Console.info({
                message: `[DEBUG] Transaction started successfully: ${transactionSuccessfullyStarted}`,
                level: LogLevel.INFO
            });
            
            // Log token info (safely)
            Console.info({
                message: `[DEBUG] Refresh token length: ${refreshToken?.length || 0}`,
                level: LogLevel.INFO
            });
            if (refreshToken) {
                const parts = refreshToken.split('.');
                Console.info({
                    message: `[DEBUG] Token format valid: ${parts.length === 3 ? 'Yes' : 'No'}, Parts: ${parts.length}`,
                    level: LogLevel.INFO
                });
            }
            
            try {
                // Verify refresh token
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;
                const userId = decoded.sub as string;
                
                Console.info({
                    message: `[DEBUG] Token verification successful. User ID: ${userId}, Token type: ${decoded.type}, Expiry: ${decoded.exp}`,
                    level: LogLevel.INFO
                });
                
                // Get user
                const user = await this.userRepository.findById(userId);
                if (!user) {
                    Console.info({
                        message: `[DEBUG] User not found with ID: ${userId}`,
                        level: LogLevel.ERROR
                    });
                    throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
                }
                
                Console.info({
                    message: `[DEBUG] User found: ${user._id}, Has refresh token: ${!!user.refresh_token}`,
                    level: LogLevel.INFO
                });
                
                // Verify stored refresh token hash
                if (!user.refresh_token) {
                    Console.info({
                        message: `[DEBUG] User has no stored refresh token`,
                        level: LogLevel.ERROR
                    });
                    throw new AuthenticationError(ResponseMessage.INVALID_REFRESH_TOKEN);
                }
                
                Console.info({
                    message: `[DEBUG] Stored token hash length: ${user.refresh_token.length}`,
                    level: LogLevel.INFO
                });
                
                const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refresh_token);
                Console.info({
                    message: `[DEBUG] Token comparison result: ${isRefreshTokenValid}`,
                    level: LogLevel.INFO
                });
                
                if (!isRefreshTokenValid) {
                    Console.info({
                        message: `[DEBUG] Token comparison failed`,
                        level: LogLevel.ERROR
                    });
                    throw new AuthenticationError(ResponseMessage.INVALID_REFRESH_TOKEN);
                }
                
                // Generate new access token
                const tokens = await this.tokenService.generateTokens(user);
                Console.info({
                    message: `[DEBUG] New tokens generated successfully`,
                    level: LogLevel.INFO
                });
                
                if (transactionSuccessfullyStarted) {
                    await this.commitTransaction();
                    Console.info({
                        message: `[DEBUG] Transaction committed successfully`,
                        level: LogLevel.INFO
                    });
                }
                
                return { user, accessToken: tokens.accessToken, refreshToken: refreshToken };
            } catch (verifyError: any) {
                Console.error(verifyError, {
                    message: `[DEBUG] JWT verification error: ${verifyError.name}: ${verifyError.message}`,
                    level: LogLevel.ERROR
                });
                throw verifyError;
            }
        } catch (error: any) {
            Console.error(error, {
                message: `[DEBUG] Refresh token error: ${error.name}: ${error.message}`,
                level: LogLevel.ERROR
            });
            
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error refreshing access token, rolling back transaction: ${error.message}`,
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
    
    async revokeRefreshToken(userId: string): Promise<void> {
        let transactionSuccessfullyStarted = false;
        try {
            // Begin Transaction neatly
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            // Clear refresh token
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
        if(!email) {
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
            
            // Generate reset token
            const resetToken = UtilityService.generate4Digit();
            
            // Hash token for storage
            const hashedToken = await UtilityService.hashToken(resetToken);
            
            
            const verification = await this.authHelpers.createEmailVerificationRecord(
                user._id as string, 
                email, 
                resetToken, 
                user.salt as string
            );
            
            // Prepare data for email template
            const otpCodeObject: EmailOTPDTO = {
                email: user.email as string, // Ensure email is treated as string
                otpCode: resetToken,
                otpExpiry: 15, // 15 minutes expiry
                userId: user._id as string,
                purpose: 'password reset', // Indicate this is for password reset
                firstName: user.first_name || user.email?.split('@')[0] // Use first name if available, otherwise use email username
            };
            
            // Send email with reset link
            await this.emailService.sendPasswordResetEmail(otpCodeObject);
            
            // Update user with reset token
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
            
            // Generate OTP
            const otp = UtilityService.generate6Digit();
            const otpExpiry = new Date();
            otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes
            
            // Hash OTP for storage
            const hashedOTP = await bcrypt.hash(otp, 10);
            
            // Update user with OTP
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
            // Send email with OTP
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
            
            // Find user by email
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }
            
            // Find verification record by reference stored in reset_token
            const verification = await this.verificationRepository.findByReference(user.reset_token as string);
            if (!verification) {
                throw new ValidationError('No password reset request found or it has expired');
            }
            
            // Validate verification type and identifier
            if (verification.type !== VerificationType.EMAIL || verification.identifier !== email) {
                throw new ValidationError('Invalid verification record');
            }
            
            // Check verification status
            if (verification.status === VerificationStatus.EXPIRED) {
                throw new ValidationError('Password reset request has expired. Please request a new code');
            }
            
            // Check OTP expiry
            const currentTime = UtilityService.dateToUnix(new Date());
            if (!verification.otp || verification.otp.expiry < currentTime) {
                throw new ValidationError('OTP has expired. Please request a new code');
            }
            
            // Check attempts
            if (verification.otp.attempts >= 3) {
                throw new ValidationError('Maximum verification attempts exceeded. Please request a new code');
            }
            
            // Verify OTP
            const hashedOtp = await CryptoService.hashString(otp, user.salt as string);
            
            // In non-production environments, '123456' is always valid
            if (!EnvironmentConfig.isProduction() && otp === '123456') {
                // Code is valid, continue with verification
            } else if (hashedOtp !== verification.otp.code) {
                // Increment attempts
                await this.verificationRepository.update(verification._id as string, {
                    otp: {
                        ...verification.otp,
                        attempts: (verification.otp.attempts || 0) + 1,
                        last_attempt: currentTime
                    }
                });
                throw new ValidationError('Invalid OTP code');
            }
            
            // Hash new password
            const hashedPassword = await CryptoService.hashString(newPassword, user.salt as string);
            
            // Update user with new password and clear OTP
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
    
    async oauth(data: CreateUserDTO): Promise<LoginResponseDTO | undefined> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            
            // Check if user exists by email
            let user = await this.userRepository.findByEmail(data.email);
            
            if (!user) {
                // const salt = CryptoService.generateValidSalt();
                
                const userObject = await User.createFromOAuth(data) as unknown as IUser;
                console.log("UserObject from oauth: ", userObject);
                // Create user with OAuth data
                user = await this.userRepository.create(userObject);
                
                // Create linked account
                if (data.provider && data.provider_id) {
                    await this.linkedAccountsRepository.create({
                        user_id: user?._id as string,
                        auth_method: AuthMethod.OAUTH,
                        oauth_provider: data.provider,
                        oauth_id: data.provider_id,
                        is_active: true
                    });
                }
            } 
            // If user exists but doesn't have this OAuth provider linked
            else if (data.provider && data.provider_id) {
                const linkedAccount = await this.linkedAccountsRepository.findByCondition({
                    user_id: user._id as string,
                    auth_method: AuthMethod.OAUTH,
                    oauth_provider: data.provider,
                    oauth_id: data.provider_id,
                    is_active: true
                });
                
                if (!linkedAccount) {
                    await this.linkedAccountsRepository.create({
                        user_id: user._id as string,
                        auth_method: AuthMethod.OAUTH,
                        oauth_provider: data.provider,
                        oauth_id: data.provider_id,
                        is_active: true
                    });
                }
            }
            
            // Generate tokens
            // const accessToken = this.generateAccessToken(user as IUser);
            // const refreshToken = await this.generateRefreshToken(user as IUser);
            const { accessToken, refreshToken } = await this.generateTokens(user as IUser);
            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }
            
            return { accessToken, refreshToken, user: this.authHelpers.constructUserObject(user as IUser) };
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error during OAuth authentication, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AuthenticationError("OAuth authentication failed");
        }
    }

    

    // =========================CONSOLIDATED APP AUTHENTICATION========================
    authenticateV2(identifier: string, password: string): Promise<LoginResponseDTO | undefined> {
        throw new Error("Method not implemented.");
    }
    // =========================CONSOLIDATED APP AUTHENTICATION========================
    
    /**
     * Generates an access token for a user
     * @param user User to generate token for
     * @returns JWT access token
    */
   private generateAccessToken(user: IUser): string {
       // For backward compatibility, we'll keep this method but use the generateTokens method internally
       return this.generateTokens(user).then(tokens => tokens.accessToken) as unknown as string;
    }
    
    /**
     * Generates and stores a refresh token for a user
     * @param user User to generate token for
     * @returns JWT refresh token
    */
   private async generateRefreshToken(user: IUser): Promise<string> {
       // For backward compatibility, we'll keep this method but use the generateTokens method internally
       const tokens = await this.generateTokens(user);
       
       // Hash token before storing
       const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
       
       // Store hashed refresh token
       await this.userRepository.update(user._id as string, { refresh_token: hashedRefreshToken });
       
       return tokens.refreshToken;
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
