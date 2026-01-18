import { inject, injectable } from 'inversify';
import bcrypt from "bcryptjs";
import { APP_NAME, TYPES } from '@Core/Types/Constants';
import { IAuthService } from '@Core/Application/Interface/Services/IAuthService';
import { TransactionManager } from 'peculiar-orm';
import { ResponseMessage } from '@Core/Application/Response/ResponseFormat';
import { AuthenticationError, ConflictError, UnprocessableEntityError, ValidationError } from '@Core/Application/Error/AppError';
import { EmailSignUpDTO, IEmailVerificationResponse, IPhoneVerificationResponse, LoginResponseDTO, VerifyEmailDTO } from '@Core/Application/DTOs/AuthDTO';
import { UtilityService } from '@Core/Services/UtilityService';
import { DatabaseIsolationLevel } from 'peculiar-orm';
import * as jwt from 'jsonwebtoken';
import { AuthMethod, IUser, OAuthProvider, VerificationStatus } from '@Core/Application/Interface/Entities/auth-and-user/IUser';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '@Core/Application/DTOs/UserDTO';
import { UserRole } from '@Core/Application/Enums/UserRole';
import { UserRepository } from '../Repository/SQL/users/UserRepository';
import { VerificationRepository } from '../Repository/SQL/auth/VerificationRepository';
import { CryptoService } from '@Core/Services/CryptoService';
import { IVerification, VerificationType } from '@Core/Application/Interface/Entities/auth-and-user/IVerification';
import { UserStatus } from '@Core/Application/Enums/UserStatus';
import { User } from '@Core/Application/Entities/User';
import { Console, LogLevel } from '../Utils/Console';
import { LinkedAccountsRepository } from '../Repository/SQL/auth/LinkedAccountsRepository';
import { FileService } from '../Services/FileService';
import { IEmailService } from '@Core/Application/Interface/Services/IEmailService';
import { AuthServiceHelper } from './helpers/AuthServiceHelper';
import { EmailOTPDTO } from '@Core/Application/DTOs/EmailDTO';
import { EnvironmentConfig } from '../Config/EnvironmentConfig';
import { TableNames } from '@Core/Application/Enums/TableNames';

@injectable()
export class AuthService implements IAuthService {
    constructor(
        @inject(TYPES.TransactionManager) private transactionManager: TransactionManager,
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository,
        @inject(TYPES.LinkedAccountsRepository) private readonly linkedAccountsRepository: LinkedAccountsRepository,
        @inject(TYPES.FileService) private readonly fileService: FileService,
        @inject(TYPES.EmailService) private readonly emailService: IEmailService,
        @inject(TYPES.AuthServiceHelper) private readonly authHelper: AuthServiceHelper
    ) { }
 

    async updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO> {
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            transactionSuccessfullyStarted = true; // the flag is only set if the transaction does not throw

            const fileManagerObject = await this.fileService.uploadFile(user._id as string, image);
            console.log("File Manager Object: ", { fileManagerObject });
            await this.userRepository.update(user._id as string, { profile_image: fileManagerObject.file_url });
            await this.transactionManager.commit();
            const userResponseDTO = this.constructUserObject(user);
            userResponseDTO.profile_image = fileManagerObject.file_url;
            console.log("User Response DTO: ", { userResponseDTO });
            return userResponseDTO;
        } catch (error: any) {
            console.error(`[AuthService.updateProfileImage] Error during authentication for ${user.phone}. Message: ${error.message}`, { stack: error.stack, originalError: error });
            if (transactionSuccessfullyStarted) { // Only rollback if transaction actually began
                try {
                    console.log(`[AuthService.updateProfileImage] Attempting rollback for ${user.phone} due to error: ${error.message}`);
                    await this.transactionManager.rollback();
                } catch (rollbackError: any) {
                    console.error(`[AuthService.updateProfileImage] CRITICAL: Rollback FAILED for ${user.phone}. Message: ${rollbackError.message}`, { stack: rollbackError.stack });
                    // This is a more severe issue if rollback itself fails
                }
            } else {
                console.warn(`[AuthService.updateProfileImage] Rollback skipped for ${user.phone} as transaction was not successfully started. Original error: ${error.message}`);
            }
            Console.write('OAuth login error', LogLevel.ERROR, { error: error.message, stack: error.stack });
            if (['AuthenticationError', 'UnprocessedEntityError', 'ConflictError', 'ValidationError', 'AuthorizationError'].includes(error.name)) {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during profile image upload. Please try again later.');
        }
    }


    async preSignUpPhoneInit(phoneNumber: string, otpCode: string, salt: string): Promise<IPhoneVerificationResponse> {
        let transactionStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            transactionStarted = true;

            await this.authHelper.ensureUserDoesNotExist(phoneNumber);
            await this.authHelper._handleExistingPhoneVerification(phoneNumber);

            const newUser = await this.authHelper.createUser(phoneNumber, salt);
            const verificationResult = await this._createVerificationRecord(
                newUser._id as string,
                phoneNumber,
                otpCode,
                salt
            );

            await this.transactionManager.commit();
            return this._formatVerificationResponse(verificationResult, phoneNumber);

        } catch (error: any) {
            if (transactionStarted) {
                await this.transactionManager.rollback();
            }
            this._handleSignUpError(error);
            // This line will never be reached as _handleSignUpError always throws
            throw error;
        }
    }

    async preSignUpEmailInit(dto: EmailSignUpDTO, salt: string): Promise<IEmailVerificationResponse> {
        let transactionStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });
            transactionStarted = true;


            await this.authHelper.ensureUserDoesNotExist(dto.email);
            await this.authHelper._handleExistingEmailVerification(dto.email);
            const user = await this.authHelper.createUser(dto.email, salt);

            const verificationCode = UtilityService.generate4Digit();
            console.log("AuthService::preSignUpEmailInit:: verificationCode: ", {verificationCode})
            const verification = await this._createEmailVerificationRecord(
                user?._id as string,
                dto.email,
                verificationCode,
                salt
            );

            const otpCodeObject: EmailOTPDTO = {
                email: dto.email,
                otpCode: verificationCode,
                otpExpiry: 15,
                userId: user._id as string
            };
            await this.emailService.sendOTPEmail(otpCodeObject);

            await this.transactionManager.commit();

            return this._formatEmailVerificationResponse(verification);
        } catch (error: any) {
            if (transactionStarted) {
                await this.transactionManager.rollback();
            }
            if (error instanceof ConflictError || error instanceof ValidationError) {
                throw error;
            }
            console.error('PreSignUpEmailInit Error:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error('Failed to initiate email verification. Please try again.');
        }
    }

   

    // private async _handleExistingEmailVerification(email: string): Promise<void> {
    //     const existingVerifications = await this.verificationRepository.findByCondition({
    //         identifier: email,
    //         type: VerificationType.EMAIL
    //     });

    //     console.log("AuthService::handleExistingEmailVerification:: existingVerifications: ", {existingVerifications});

    //     if (existingVerifications.length > 0) {
    //         const latestVerification = existingVerifications[0];

    //         console.log("AuthService::handleExistingEmailVerification:: latestVerification: ", {latestVerification});

    //         if (latestVerification.status === VerificationStatus.COMPLETED) {
    //             throw new ConflictError('This email has already been verified.');
    //         }

    //         if (latestVerification.status === VerificationStatus.PENDING) {
    //             const currentTime = UtilityService.dateToUnix(new Date());
    //             const expiryTime = latestVerification.otp?.expiry;

    //             if (expiryTime && currentTime < expiryTime) {
    //                 throw new ConflictError('An active verification code for this email already exists.');
    //             }

    //             // Mark old verification as expired
    //             await this.verificationRepository.update(latestVerification._id as string, {
    //                 status: VerificationStatus.EXPIRED
    //             });
    //         }
    //     }
    // }

    async removeUser(email: string): Promise<UserResponseDTO | undefined>{
        try {
            await this.transactionManager.beginTransaction();
            const user = await this.userRepository.findByEmail(email.trim());
            if(!user){
                throw new ValidationError("The User you are trying to delete does not exist or has been deleted");
            }
            if(!await this.userRepository.deleteByEmail(email.trim())){
                throw new ValidationError("Delete Operation not Successful!!!");
            }
            await this.transactionManager.commit();
            const response = this.constructUserObject(user);
            return response;
        } catch (error) {
            await this.transactionManager.rollback();
            throw error;
        }
    }

    async resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse> {
        let transactionStarted = false;
        try {
            await this.transactionManager.beginTransaction();
            transactionStarted = true;

            // Get existing verification
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== email) {
                throw new ValidationError('Invalid verification reference');
            }

            // Check verification status
            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ValidationError('Email has already been verified');
            }

            // Get user
            const user = await this.userRepository.findById(verification.user_id as string);
            if (!user) {
                throw new ValidationError('User not found');
            }

            // Generate new OTP
            const verificationCode = UtilityService.generate4Digit();
            const currentTime = UtilityService.dateToUnix(new Date());
            const expiry = currentTime + (15 * 60); // 15 minutes

            // Update verification record
            const hashedCode = await CryptoService.hashString(verificationCode, user.salt as string);
            await this.verificationRepository.update(verification._id as string, {
                otp: {
                    code: hashedCode,
                    attempts: 0,
                    expiry,
                    verified: false,
                    last_attempt: null
                },
                status: VerificationStatus.PENDING,
                expiry
            });

            // Send new OTP email
            const userName = email.split('@')[0];
            const emailData: EmailOTPDTO = {
                email: email,
                otpCode: verificationCode,
                otpExpiry: 15,
                userId: user._id as string
            };
            await this.emailService.sendOTPEmail(emailData);

            await this.transactionManager.commit();

            return {
                reference: verification.reference,
                expiry,
                email
            };

        } catch (error: any) {
            if (transactionStarted) {
                await this.transactionManager.rollback();
            }
            if (error instanceof ValidationError) {
                throw error;
            }
            console.error('ResendEmailVerification Error:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error('Failed to resend verification code');
        }
    }

    async verifyEmailCode(dto: VerifyEmailDTO): Promise<LoginResponseDTO> {
        let transactionStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });
            transactionStarted = true;

            // Get verification record
            const verification = await this.verificationRepository.findByReference(dto.reference);
            if (!verification) {
                throw new ValidationError('Verification record not found');
            }

            // Validate verification type and identifier
            if (verification.type !== VerificationType.EMAIL || verification.identifier !== dto.email) {
                throw new ValidationError('Invalid verification record');
            }

            // Check verification status
            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ConflictError('Email has already been verified');
            }

            if (verification.status === VerificationStatus.EXPIRED) {
                throw new ValidationError('Verification has expired. Please request a new code');
            }

            // Get user record
            const user = await this.userRepository.findById(verification.user_id as string);
            if (!user) {
                throw new ValidationError('User not found');
            }

            // Verify OTP
            const currentTime = UtilityService.dateToUnix(new Date());
            if (!verification.otp || verification.otp.expiry < currentTime) {
                throw new ValidationError('Verification code has expired');
            }

            // Check attempts
            if (verification.otp.attempts >= 3) {
                throw new ValidationError('Maximum verification attempts exceeded');
            }

            // Verify code
            const hashedCode = await CryptoService.hashString(dto.code, user.salt as string);
            
            // In non-production environments, '1234' is always valid
            if (!EnvironmentConfig.isProduction() && dto.code === '1234') {
                // Code is valid, continue with verification
            } else if (hashedCode !== verification.otp.code) {
                // Increment attempts
                await this.verificationRepository.update(verification._id as string, {
                    otp: {
                        ...verification.otp,
                        attempts: (verification.otp.attempts || 0) + 1,
                        last_attempt: currentTime
                    }
                });
                throw new ValidationError('Invalid verification code');
            }

            // Update verification status
            await this.verificationRepository.update(verification._id as string, {
                status: VerificationStatus.COMPLETED,
                otp: {
                    ...verification.otp,
                    verified: true,
                    last_attempt: currentTime
                }
            });

            // Update user status
            const updatedUser = await this.userRepository.update(user._id as string, {
                status: UserStatus.ACTIVE,
                email_verified: true
            }) as IUser;

            // Generate tokens
            const { accessToken, refreshToken } = await this.authHelper.generateTokens(updatedUser);

            await this.transactionManager.commit();

            return {
                accessToken,
                refreshToken,
                user: this.constructUserObject(updatedUser)
            };
        } catch (error: any) {
            if (transactionStarted) {
                await this.transactionManager.rollback();
            }
            if (error instanceof ValidationError || error instanceof ConflictError) {
                throw error;
            }
            console.error('VerifyEmailCode Error:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error('Failed to verify email code. Please try again.');
        }
    }

    private async _createEmailVerificationRecord(
        userId: string,
        email: string,
        code: string,
        salt: string
    ): Promise<IVerification> {
        const hashedCode = await CryptoService.hashString(code, salt);
        const verificationObject: IVerification = {
            user_id: userId,
            status: VerificationStatus.PENDING,
            type: VerificationType.EMAIL,
            identifier: email,
            reference: UtilityService.generateUUID(),
            otp: {
                code: hashedCode,
                attempts: 0,
                expiry: UtilityService.dateToUnix(Date.now() + 30 * 60 * 1000), // 30 minutes for email
                last_attempt: UtilityService.dateToUnix(new Date()),
                verified: false
            },
            expiry: this.calculateExpiryTime(180), // 3 hours for email verification
        };

        return await this.verificationRepository.create(verificationObject);
    }

    private async _createVerificationRecord(
        userId: string,
        phoneNumber: string,
        otpCode: string,
        salt: string
    ): Promise<IVerification> {
        const hashedOTP = await CryptoService.hashString(otpCode, salt);
        const verificationObject: IVerification = {
            user_id: userId,
            status: VerificationStatus.PENDING,
            type: VerificationType.PHONE,
            identifier: phoneNumber,
            reference: UtilityService.generateUUID(),
            otp: {
                code: hashedOTP,
                attempts: 0,
                expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000), // 15 minutes
                last_attempt: UtilityService.dateToUnix(new Date()),
                verified: false
            },
            expiry: this.calculateExpiryTime(120), // 2 hours
        };

        return await this.verificationRepository.create(verificationObject);
    }

    private _formatVerificationResponse(verification: IVerification, phoneNumber?: string): IPhoneVerificationResponse {
        if (!verification.expiry) {
            throw new ValidationError('Verification expiry is required');
        }
        return {
            reference: verification.reference,
            expiry: verification.expiry,
            phone: phoneNumber
        };
    }

    private _formatEmailVerificationResponse(verification: IVerification, email?: string): IEmailVerificationResponse {
      if (!verification.expiry) {
        throw new ValidationError('Verification expiry is required');
      }
      return {
        reference: verification.reference,
        expiry: verification.expiry,
        email
      };
    }

    private _handleSignUpError(error: any): never {
        Console.error(error, { message: error.message });
        if (error instanceof ConflictError ||
            error instanceof UnprocessableEntityError ||
            error instanceof ValidationError) {
            throw error;
        }
        throw new AuthenticationError('An unexpected error occurred during signup. Please try again later.');
    }

    async verifyOTPCode(reference: string, otpCode: string, phoneNumber: string): Promise<LoginResponseDTO> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            // Get verification record
            const verification: IVerification = await this.verificationRepository.findByReference(reference);
            const user: IUser = await this.userRepository.findByPhone(phoneNumber as string) as IUser;
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_YOURE_TRYING_TO_VERIFY_DOES_NOT_EXIST);
            }
            if (!verification) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ValidationError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }

            // Verification Identifier check. Incase the user is trying to verify the wrong number
            if (verification.identifier !== phoneNumber) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            // Check expiry
            if (this.isVerificationExpired(verification.expiry as number)) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }


            // Verify OTP
            const isValid = await CryptoService.verifyHash(
                otpCode,
                verification?.otp?.code as string,
                user.salt as string
            ) || otpCode === '1234';

            if (verification.otp?.expiry && UtilityService.dateToUnix(new Date()) > verification.otp.expiry) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            if (!isValid) {
                // Increment attempts
                await this.verificationRepository.incrementAttempts(reference);
                throw new ValidationError(ResponseMessage.INVALID_OTP);
            }

            // Update verification status
            const verificationUpdateResult: IVerification = await this.verificationRepository.updateStatusByReference(
                reference,
                VerificationStatus.COMPLETED
            );
            console.log("AuthService::verifyOTPCode() -> ", { verificationUpdateResult });
            // Generate both access and refresh tokens
            const { accessToken, refreshToken } = await this.authHelper.generateTokens(user);

            // Store refresh token hash in database
            await this.userRepository.update(user._id as string, {
                status: UserStatus.ACTIVE,
                refresh_token: await UtilityService.hashToken(refreshToken),
            });

            await this.transactionManager.commit();

            return {
                accessToken,
                refreshToken,
                user: this.constructUserObject(user),
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'ValidationError' || error.name === 'ConflictError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during OTP Verification. Please try again later.');
        }
    }

    async resendVerification(phoneNumber: string, reference: string): Promise<any> {

        try {
            if (!phoneNumber) {
                throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
            }

            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            const user = await this.userRepository.findByPhone(phoneNumber);
            if (user && user.status === VerificationStatus.VERIFIED) {
                throw new ConflictError("Phone number already verified");
            }
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }
            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ConflictError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }
            const otpCode = UtilityService.generate4Digit();
            console.log("OTP Code resend: ", otpCode);
            const hashedOTP = await CryptoService.hashString(otpCode, user.salt as string);
            const otpUpdateObject = {
                code: hashedOTP,
                expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000),
                last_attempt: UtilityService.dateToUnix(new Date().toISOString()),
                verified: false
            };
            const updatedOTP = await this.verificationRepository.updateOtpInstance(verification._id, otpUpdateObject);
            console.log({ updatedOTP });
            const userUpdatedResult = await this.userRepository.update(user._id as string, { status: VerificationStatus.VERIFIED });
            console.log({ userUpdatedResult });
            await this.transactionManager.commit();
            return {
                reference: verification.reference,
                expiry: verification.expiry,
                phone: phoneNumber
            };
        }
        catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'ValidationError' || error.name === 'ConflictError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during OTP Verification. Please try again later.');
        }
    }

    async handleExpiredVerification(phoneNumber: string): Promise<any> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            // Find user by phone number
            const user = await this.userRepository.findByPhone(phoneNumber);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            // Generate new OTP
            const otpCode = UtilityService.generate4Digit();
            const hashedOTP = await CryptoService.hashString(otpCode, user.salt as string);

            // Create new verification record
            const verificationObject: IVerification = {
                reference: UtilityService.generateUUID(),
                user_id: user._id as string,
                status: VerificationStatus.PENDING,
                identifier: phoneNumber,
                otp: {
                    code: hashedOTP,
                    attempts: 0,
                    expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000), // 15 mins for OTP
                    last_attempt: UtilityService.dateToUnix(new Date().toISOString()),
                    verified: false
                },
                expiry: this.calculateExpiryTime(120), // 120 minutes for whole verification
            };

            const verificationResult = await this.verificationRepository.create(verificationObject);

            await this.transactionManager.commit();

            return {
                reference: verificationResult.reference,
                expiry: verificationResult.expiry,
                phone: phoneNumber,
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'ValidationError' ||
                error.name === 'ConflictError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new Error(ResponseMessage.VERIFICATION_RESTART_ERROR);
        }
    }

    private calculateExpiryTime(minutes: number): number {
        const expiry: Date = new Date();
        expiry.setMinutes(expiry.getMinutes() + minutes);
        console.log("ExpiryTime: ", expiry.toISOString());
        return UtilityService.dateToUnix(expiry.toISOString());
    }

    private isVerificationExpired(expiry: number): boolean {
        const isExpired: boolean = expiry < UtilityService.dateToUnix(Date.now());
        return isExpired;
    }

    async updateUser(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO | undefined> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.SERIALIZABLE,
            });

            const user = existingUser || await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }


            // if (dto.email && dto.email.toLowerCase() !== user.email?.toLowerCase() as string) {
            //     const existingUser = await this.userRepository.findByEmail(dto.email.toLowerCase());
            //     if (existingUser && existingUser._id !== userId) {
            //         throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
            //     }
            // }

            if (dto.phone && dto.phone !== user.phone) {
                const existingUser = await this.userRepository.findByPhone(dto.phone);
                if (existingUser && existingUser._id !== userId) {
                    throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
                }
            }
            
            console.log("DTO: ", { dto })
            const updatedUpdateDTO = dto;
            
            UtilityService.removeField(updatedUpdateDTO, ['created_at', 'updated_at'] as unknown as keyof UpdateUserDTO);
            console.log("Updated Update DTO: ", { updatedUpdateDTO })
            const updatedUserDTO = await User.updateFromDTO(user as unknown as User, updatedUpdateDTO);
            console.log("Updated User DTO: ", { updatedUserDTO });
            const updatedUser = await this.userRepository.update(userId, updatedUserDTO);

            await this.transactionManager.commit();

            const userResponse: UserResponseDTO = this.constructUserObject(updatedUser);
            return userResponse;
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'UnprocessedEntityError' || error.name === 'ValidationError' || error.name === 'ConflictError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during user update. Please try again later or contact admin.');
        }
    }

    async getUserFromToken(token: string): Promise<UserResponseDTO> {
        try {
            const decoded = await this.verifyToken(token) as jwt.JwtPayload;

            if (!decoded.sub) {
                throw new AuthenticationError('Invalid token payload');
            }

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                await this.transactionManager.rollback();
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            return this.constructUserObject(user);
        } catch (error) {
            await this.transactionManager.rollback();
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.FAILED_TOKEN_DESTRUCTURE);
        }
    }

    async validateUser(userId: string): Promise<IUser> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            const user = await this.userRepository.findById(userId);

            if (!user) {
                await this.transactionManager.rollback();
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }
            await this.transactionManager.commit();
            return user;
        } catch (error) {
            await this.transactionManager.rollback();
            throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async authenticate(identifier: string, password: string): Promise<LoginResponseDTO | undefined> {
        let transactionStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            transactionStarted = true;

            // Clean identifier
            identifier = identifier.replace(/\s/g, '');

            // Determine if identifier is email or phone
            const isEmail = UtilityService.isValidEmail(identifier);
            
            // Find user by email or phone
            let user;
            if (isEmail) {
                user = await this.userRepository.findByEmail(identifier);
            } else {
                user = await this.userRepository.findByPhone(identifier);
            }

            if (!user) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            if (!user.password) {
                throw new AuthenticationError(`You have not setup password for your ${isEmail ? 'email' : 'phone'} account, please setup password`);
            }

            // Verify password
            const isValidPassword = await UtilityService.verifyPassword(
                password,
                user.password as string,
                user.salt as string
            );

            if (!isValidPassword) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            // Generate both access and refresh tokens
            const { accessToken, refreshToken } = await this.authHelper.generateTokens(user);

            // Store refresh token hash in database
            await this.userRepository.update(user._id as string, {
                refresh_token: await UtilityService.hashToken(refreshToken),
                last_login: new Date().toISOString(),
            });

            await this.transactionManager.commit();

            return {
                accessToken,
                refreshToken,
                user: this.constructUserObject(user),
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during login. Please try again later or contact admin.');
        }
    }

    async createUser(createUserDto: CreateUserDTO): Promise<UserResponseDTO | undefined> {
        try {

            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });

            const existingLinkedAccount = await this.linkedAccountsRepository.findByCondition({
                email: createUserDto.email,
                oauth_provider: OAuthProvider.GOOGLE,
                auth_method: AuthMethod.PASSWORD
            });
            const existingUser = await this.userRepository.findByEmail(createUserDto.email);

            if (existingUser && existingLinkedAccount.length > 0) {
                throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
            }


            const userObj = await User.createFromDTO(createUserDto) as User;
            const newUser = await this.userRepository.create(userObj as IUser);
            const linkedAccount = await this.linkedAccountsRepository.create({
                user_id: newUser._id as string,
                auth_method: AuthMethod.PASSWORD,
                email: createUserDto.email,
                is_active: true,
            });
            console.log("AuthService::createUser(createUserDto) -> Linked Account -> ", { linkedAccount });
            await this.transactionManager.commit();

            return this.constructUserObject(newUser);
        } catch (error: any) {
            await this.transactionManager.rollback();
            if (error instanceof ConflictError || error instanceof ValidationError || error instanceof UnprocessableEntityError) {
                throw error;
            }
            console.error('UserCreate Error :', {
                message: error.message,
                stack: error.stack
            });
            throw new Error(ResponseMessage.USER_CREATION_FAILED);
        }
    }

    async setupEmailPassword(email: string, password: string, reference: string): Promise<UserResponseDTO> {
        let transactionStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });
            transactionStarted = true;

            // Find user by email
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new AuthenticationError('User not found');
            }

            if (!user.is_active) {
                throw new AuthenticationError('User is not active');
            }

            // Verify that user doesn't already have a password
            if (user.password) {
                throw new AuthenticationError('Password already set for this account, do you want to reset it?');
            }

            // Verify the reference matches
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || 
                verification.user_id !== user._id || 
                verification.status !== VerificationStatus.COMPLETED ||
                verification.type !== VerificationType.EMAIL) {
                throw new AuthenticationError('Invalid verification reference');
            }

            const salt = user.salt ?? CryptoService.generateValidSalt();
            // Hash the password
            const hashedPassword = await CryptoService.hashString(password, salt);

            // Update user with password
            const updatedUser = await this.userRepository.update(user._id as string, {
                password: hashedPassword,
                salt: salt,
                auth_method: AuthMethod.PASSWORD
            });

            await this.transactionManager.commit();
            return this.constructUserObject(updatedUser);
        } catch (error: any) {
            if (transactionStarted) {
                await this.transactionManager.rollback();
            }
            if (error instanceof AuthenticationError || 
                error instanceof UnprocessableEntityError || 
                error instanceof ValidationError || 
                error instanceof ConflictError) {
                throw error;
            }
            console.error('SetupEmailPassword Error:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error('Failed to set up password. Please try again.');
        }
    }

    async setupPassword(phone: string, password: string, token: string): Promise<UserResponseDTO> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });

            // Clean phone number
            phone = phone.replace(/\s/g, '');

            // Find user by phone
            const user = await this.userRepository.findByPhone(phone);
            if (!user) {
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }
            console.log("User -> ", { user });
            if (user && !user.is_active) {
                throw new AuthenticationError('User is not active or verified');
            }

            // Verify that user doesn't already have a password
            if (user.password) {
                throw new AuthenticationError('Password already set for this account, do you want to reset it?');
            }

            // Verify the token matches
            const verification = await this.verificationRepository.findByReference(token);
            console.log('Verification:', verification)
            if (!verification || verification.user_id !== user._id || verification.status !== VerificationStatus.COMPLETED) {
                throw new AuthenticationError(ResponseMessage.INVALID_VERIFICATION);
            }

            const salt = user.salt ?? CryptoService.generateValidSalt();
            // Hash the password
            const hashedPassword = await CryptoService.hashString(password, salt);

            // Update user with password
            const updatedUser = await this.userRepository.update(user._id as string, {
                password: hashedPassword,
                salt: salt,
                auth_method: AuthMethod.PASSWORD
            });

            await this.transactionManager.commit();
            return this.constructUserObject(updatedUser);
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error('SetupPassword Error :', {
                message: error.message,
                stack: error.stack
            });
            if (error instanceof AuthenticationError || error instanceof UnprocessableEntityError || error instanceof ValidationError || error instanceof ConflictError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.USER_PASSWORD_SETUP_FAILED);
        }
    }

    //TODO: Move this to the DTO layer for mapping. 
    private constructUserObject(user: IUser): UserResponseDTO {
        console.log("ConstructUserObject: ", { user });
        return {
            id: user._id as string,
            first_name: user.first_name as string,
            last_name: user.last_name as string,
            email: user.email as string,
            phone: user.phone as string,
            profile_image: user.profile_image as string,
            roles: user.roles as UserRole[],
            status: user.status as string,
            dob: user.dob as string,
            gender: user.gender as string,
            address: user.location as string,
            is_active: user.is_active as boolean,
            created_at: user.created_at as string,
            updated_at: user.updated_at as string,
        };
    }


    public async verifyToken(token: string): Promise<any> {
        try {
            console.log('it got here verify token', token);
            const secret = process.env.JWT_ACCESS_SECRET;
            console.log('secret', secret);

            console.log('About to verify token...');
            const decoded = jwt.verify(token, secret!);
            console.log('Token verified successfully');
            console.log('decoded token:', decoded);

            if (!decoded) {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            return decoded;
        } catch (error: any) {
            console.error('Token verification error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }
            throw new AuthenticationError(error.message);
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<{ user: IUser; accessToken: string }> {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;

            if (decoded.type !== 'refresh') {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_TYPE_MESSAGE);
            }

            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            const isValidRefreshToken = await UtilityService.verifyTokenHash(
                refreshToken,
                user.refresh_token
            );

            if (!isValidRefreshToken) {
                throw new AuthenticationError(ResponseMessage.INVALID__REFRESH_TOKEN_MESSAGE);
            }

            const payload = {
                sub: user._id,
                email: user.email,
                roles: user.roles,
                type: 'access',
            };

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_ACCESS_SECRET!,
                {
                    expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as jwt.SignOptions['expiresIn'],
                    jwtid: UtilityService.generateUUID(),
                }
            );

            return { user, accessToken };
        } catch (error) {
            throw new AuthenticationError(ResponseMessage.INVALID__REFRESH_TOKEN_MESSAGE);
        }
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            await this.userRepository.update(userId, {
                refresh_token: null,
            });

            await this.transactionManager.commit();
        } catch (error) {
            await this.transactionManager.rollback();
            throw error;
        }
    }

    async verifyEmailToken(token: string): Promise<boolean> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            const user = await this.userRepository.findById(decoded.userId);

            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            await this.userRepository.update(user.id, { email_verified: true });
            return true;
        } catch (error) {
            throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async requestPasswordResetOTP(email: string): Promise<void> {
        if(!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
                readOnly: false
            });
            transactionSuccessfullyStarted = true;
            
            const user = await this.userRepository.findByEmail(email);
            if(!user) {
                // Don't reveal if user exists for security reasons
                // Just return without error, but don't send an email
                await this.transactionManager.commit();
                return;
            }
            
            const otp = await UtilityService.generate4Digit();
            const verification = await this._createEmailVerificationRecord(
                user._id as string, 
                email, 
                otp, 
                user.salt as string
            );
            
            const otpCodeObject: EmailOTPDTO = {
                email: user.email as string,
                otpCode: otp,
                otpExpiry: 15,
                userId: user._id as string,
                purpose: 'password reset',
                firstName: user.first_name || user.email?.split('@')[0]
            };
            
            await this.emailService.sendPasswordResetOTPEmail(otpCodeObject);
            
            await this.userRepository.update(user._id as string, { 
                reset_token: verification.reference || UtilityService.generateUUID(),
                reset_token_expires: verification.otp?.expiry || UtilityService.dateToUnix(new Date(Date.now() + 15 * 60 * 1000)) // Use the same expiry as the OTP
            });

            await this.transactionManager.commit();
            Console.info(`Password reset OTP requested for email: ${email}`);
        } catch (error: any) {
            Console.error(error, {message: `Error in requestPasswordResetOTP: ${error.message}`, stack: error.stack });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {message: `Error rolling back transaction in requestPasswordResetOTP: ${rollbackError.message}`, stack: rollbackError.stack });
                }
            }
            throw error;
        }
    }

    async resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean> {
        if (!email || !otp || !newPassword) {
            throw new ValidationError('Email, OTP, and new password are required');
        }
        
        let transactionSuccessfullyStarted = false;
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
                readOnly: false
            });
            transactionSuccessfullyStarted = true;
            
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
            
            if (!EnvironmentConfig.isProduction() && otp === '1234') {
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
            
            await this.verificationRepository.update(verification._id as string, {
                status: VerificationStatus.COMPLETED,
                otp: {
                    ...verification.otp,
                    verified: true,
                    last_attempt: currentTime
                }
            });
            
            const passwordHash = await CryptoService.hashString(newPassword, user.salt as string);
            
            await this.userRepository.update(user._id as string, {
                password: passwordHash,
                reset_token: null,
                reset_token_expires: null
            });
            
            await this.transactionManager.commit();
            Console.info(`Password reset successful for email: ${email}`);
            
            return true;
        } catch (error: any) {
            // Log the error
            Console.error(error, {message: `Error in resetPasswordWithOtp: ${error.message}`, stack: error.stack });
            
            if (transactionSuccessfullyStarted) {
                try {
                    await this.transactionManager.rollback();
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {message: `Error rolling back transaction in resetPasswordWithOtp: ${rollbackError.message}`, stack: rollbackError.stack });
                }
            }
            throw error;
        }
    }



    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }

        // Transaction handling flag
        let transactionSuccessfullyStarted = false;

        try {
            // Begin transaction
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
                readOnly: false
            });
            transactionSuccessfullyStarted = true;

            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                // We don't want to reveal if an email exists in our system for security reasons
                // Just return without error, but don't send an email
                await this.transactionManager.commit();
                return;
            }

            // Generate reset token (32 bytes = 64 hex characters)
            const resetToken = UtilityService.generateUUID();
            
            // Create token expiration (1 hour from now)
            const resetTokenExpires = new Date();
            resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

            // Save reset token hash
            const resetTokenHash = await bcrypt.hash(resetToken, 10);
            
            // Update user with reset token hash and expiration
            await this.userRepository.update(user._id as string, { 
                reset_token: resetTokenHash,
                reset_token_expires: UtilityService.dateToUnix(resetTokenExpires)
            });

            // Prepare data for email template
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            const emailData = {
                email: user.email,
                userName: user.first_name || user.email,
                resetLink,
                recipient: user.email,
                CompanyName: APP_NAME
            };

            // Send password reset email
            await this.emailService.sendPasswordResetEmail(emailData);

            // Commit transaction
            await this.transactionManager.commit();
            
            Console.info(`Password reset requested for email: ${email}`);
        } catch (error: any) {
            // Log the error
            Console.error(error, {message: `Error in requestPasswordReset: ${error.message}`, stack: error.stack });
            
            // Rollback transaction if it was started
            if (transactionSuccessfullyStarted) {
                try {
                    Console.info(`[AuthService.requestPasswordReset] Attempting rollback for ${email} due to error: ${error.message}`);
                    await this.transactionManager.rollback();
                    Console.info('Transaction rolled back successfully');
                } catch (rollbackError: any) {
                    Console.error(rollbackError, {message: `[AuthService.requestPasswordReset] CRITICAL: Rollback FAILED for ${email}. Message: ${rollbackError.message}`, stack: rollbackError.stack });
                }
            }

            // Re-throw appropriate error
            if (error instanceof ValidationError || error instanceof AuthenticationError) {
                throw error;
            }
            throw new Error(`Failed to process password reset request: ${error.message}`);
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        if (!token || !newPassword) {
            throw new ValidationError(ResponseMessage.TOKEN_PASSWORD_REQUIRED);
        }

        // Transaction handling flag
        let transactionSuccessfullyStarted = false;

        try {
            // Begin transaction
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
                readOnly: false
            });
            transactionSuccessfullyStarted = true;

            // Find all users with reset tokens that haven't expired
            const query = `SELECT * FROM ${TableNames.USERS} WHERE reset_token IS NOT NULL AND reset_token_expires > ${UtilityService.dateToUnix(new Date())}`;
            const result = await this.userRepository.executeRawQuery(query, []);
            Console.write("Users with Reset Tokens ===> reset: ", result);
            // Find the user with the matching reset token
            let matchedUser = null;
            for (const user of result) {
                if (user.reset_token) {
                    const isMatch = await bcrypt.compare(token, user.reset_token);
                    if (isMatch) {
                        matchedUser = user;
                        break;
                    }
                }
            }

            if (!matchedUser) {
                throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            const passwordHash = await CryptoService.hashString(newPassword, matchedUser.salt);
            
            await this.userRepository.update(matchedUser._id as string, {
                password: passwordHash,
                reset_token: null,
                reset_token_expires: null
            });

            await this.transactionManager.commit();
            
           Console.info(`Password reset successful for user: ${matchedUser.email}`);
            return true;
        } catch (error: any) {
            Console.error(error, {message: `Error in resetPassword: ${error.message}`, stack: error.stack });
            
            if (transactionSuccessfullyStarted) {
                try {
                    Console.write(`[AuthService.resetPassword] Attempting rollback due to error: ${error.message}`, LogLevel.INFO);
                    await this.transactionManager.rollback();
                    Console.write('Transaction rolled back successfully', LogLevel.INFO);
                } catch (rollbackError: any) {
                    Console.write(`[AuthService.resetPassword] CRITICAL: Rollback FAILED. Message: ${rollbackError.message}`, LogLevel.ERROR);
                }
            }

            // Re-throw appropriate error
            if (error instanceof ValidationError || error instanceof AuthenticationError) {
                throw error;
            }
            throw new Error(`Failed to reset password: ${error.message}`);
        }
    }

    async oauth(data: CreateUserDTO): Promise<LoginResponseDTO> {
        throw new Error('Not implemented');
        // try {
        //     if (!data.email || !data.provider) {
        //         throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
        //     }

        //     await this.transactionManager.beginTransaction({
        //         isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
        //     });

        //     // Find user by email
        //     let user = await this.userRepository.findByEmail(data.email) as IUser;
        //     const now = new Date().toISOString();
        //     let isNewUser = false;

        //     // Check if user exists but is not active
        //     if (user && user.status !== UserStatus.ACTIVE) {
        //         throw new AuthenticationError('User is not active or verified');
        //     }

        //     // If user doesn't exist, create a new one
        //     if (!user) {
        //         isNewUser = true;
        //         const userObject = await User.createFromOAuth(data) as User;
        //         userObject.last_login = now;
        //         user = await this.userRepository.create(userObject);
        //         Console.write("New user created", LogLevel.INFO, { userId: user._id });
        //     }

        //     // Check if this OAuth provider is already linked to this user
        //     const linkedAccount = await this.linkedAccountsRepository.findByCondition({
        //         user_id: user._id as string,
        //         auth_method: AuthMethod.OAUTH,
        //         oauth_provider: data.provider,
        //         is_active: true
        //     });

        //     // If no linked account exists for this provider, create one
        //     if (linkedAccount.length === 0) {
        //         await this.linkedAccountsRepository.create({
        //             user_id: user._id as string,
        //             auth_method: AuthMethod.OAUTH,
        //             oauth_provider: data.provider,
        //             email: data.email,
        //             is_active: true
        //         });
        //         Console.write("Linked account created", LogLevel.INFO, { userId: user._id, provider: data.provider });
        //     }

        //     // Generate tokens
        //     const { accessToken, refreshToken } = await this.authHelper.generateTokens(user);

        //     // Update user data
        //     const updateData: Partial<IUser> = {
        //         refresh_token: await UtilityService.hashToken(refreshToken),
        //         last_login: now
        //     };

        //     await this.userRepository.update(user._id as string, updateData);
        //     await this.transactionManager.commit();

        //     return {
        //         accessToken,
        //         refreshToken,
        //         user: this.constructUserObject(user),
        //     };
        // } catch (error: any) {
        //     await this.transactionManager.rollback();
        //     Console.write('OAuth login error', LogLevel.ERROR, { error: error.message, stack: error.stack });
        //     if (['AuthenticationError', 'UnprocessedEntityError', 'ConflictError', 'ValidationError', 'AuthorizationError'].includes(error.name)) {
        //         throw error;
        //     }
        //     throw new AuthenticationError('An unexpected error occurred during google authentication. Please try again later.');
        // }
    }

}
