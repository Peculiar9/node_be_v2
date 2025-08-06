import { inject, injectable } from "inversify";
import { TYPES } from "../../Core/Types/Constants";
import { IRegistrationService } from "../../Core/Application/Interface/Services/IRegistrationService";
import { CreateUserDTO, UserResponseDTO } from "../../Core/Application/DTOs/UserDTO";
import { EmailSignUpDTO, VerifyEmailDTO, IEmailVerificationResponse, IPhoneVerificationResponse, LoginResponseDTO } from "../../Core/Application/DTOs/AuthDTO";
import { UserRepository } from "../Repository/SQL/users/UserRepository";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { Console, LogLevel } from "../Utils/Console";
import { AppError, ValidationError, UnprocessableEntityError, ConflictError, AuthenticationError, InternalServerError, NotFoundError } from "../../Core/Application/Error/AppError";
import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';
import { EnvironmentConfig } from '../Config/EnvironmentConfig';
import { CryptoService } from "../../Core/Services/CryptoService";
import { EmailService } from "./EmailService";
import { UtilityService } from "../../Core/Services/UtilityService";
import { IUser, VerificationStatus } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { VerificationType, IUserKYC, KYCStage, KYCStatus } from "../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { User } from "../../Core/Application/Entities/User";
import { UserStatus } from "../../Core/Application/Enums/UserStatus";
import { DatabaseIsolationLevel } from "../../Core/Application/Enums/DatabaseIsolationLevel";
import { SMSService } from "./SMSService";
import { BaseService } from "./base/BaseService";
import { AuthHelpers } from "./helpers/AuthHelpers";
import { ITokenService } from "../../Core/Application/Interface/Services/ITokenService";
import { RegisterUserDTOV2 } from "../../Core/Application/DTOs/AuthDTOV2";
import { UserRole } from "../../Core/Application/Enums/UserRole";
import { UserKYCRepository } from "../Repository/SQL/auth/UserKYCRepository";

@injectable()
export class RegistrationService extends BaseService implements IRegistrationService {
    // The IAuthenticationService is needed to generate JWT tokens upon successful registration.
    // To avoid a circular dependency issue (as AuthenticationService might need RegistrationService),
    // we manually resolve it here. This is a standard pattern in InversifyJS for such cases.
    // private get authenticationService(): IAuthenticationService {
    //     return new (require('./AuthenticationService').AuthenticationService)(
    //         this.userRepository,
    //         new (require('../Repository/SQL/auth/LinkedAccountsRepository').LinkedAccountsRepository)(this.transactionManager),
    //         this.transactionManager,
    //         this.authHelpers,
    //         this.emailService
    //     );
    // }

    constructor(
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository,
        @inject(TYPES.UserKYCRepository) private readonly userKYCRepository: UserKYCRepository,
        @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
        @inject(TYPES.AuthHelpers) private readonly authHelpers: AuthHelpers,
        @inject(TYPES.TokenService) private readonly tokenService: ITokenService,
        @inject(TYPES.EmailService) private readonly emailService: EmailService,
        @inject(TYPES.SMSService) private readonly smsService: SMSService
    ) {
        super(transactionManager);
    }

    /**
     * @inheritdoc
     */
    async preSignUpPhoneInit(phoneNumber: string, otpCode: string, salt?: string): Promise<IPhoneVerificationResponse> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction(DatabaseIsolationLevel.SERIALIZABLE);

            await this.authHelpers.ensureUserDoesNotExist(phoneNumber);
            await this.authHelpers.handleExistingPhoneVerification(phoneNumber);
            
            const generatedSalt = salt || CryptoService.generateValidSalt();
            const userEntity = await User.createFromPhone(phoneNumber);
            if (!userEntity) {
                throw new AppError("Failed to create user object", 500);
            }
            userEntity.salt = generatedSalt;
            const newUser = await this.userRepository.create(userEntity);
            
            const verification = await this.authHelpers.createPhoneVerificationRecord(newUser._id!, phoneNumber, otpCode, generatedSalt);

            await this.commitTransaction();
            
            return this.authHelpers.formatPhoneVerificationResponse(verification);
        } catch (error: any) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "phone initiation");
        }
    }

    /**
     * @inheritdoc
     */
    async verifyPhoneOtp(reference: string, otpCode: string, phoneNumber: string): Promise<LoginResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== phoneNumber) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }
            
            const userByPhone: IUser = await this.userRepository.findByPhone(phoneNumber as string) as IUser;
            if (!userByPhone) {
                throw new ValidationError(ResponseMessage.USER_YOURE_TRYING_TO_VERIFY_DOES_NOT_EXIST);
            }
            if (!verification) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ValidationError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }

            const user = await this.userRepository.findById(verification.user_id!);
            if (!user) {
                throw new UnprocessableEntityError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            const isExpired = this.authHelpers.isVerificationExpired(verification.expiry!);
            if (isExpired) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            const currentTime = UtilityService.dateToUnix(new Date());
        
        // In non-production environments '1234' is always valid
        if (!EnvironmentConfig.isProduction() && otpCode === '1234') {
            // Code is valid, continue with verification
        } else {
            // Verify the code using hash comparison
            const hashedCode = await CryptoService.hashString(otpCode, user.salt as string);
            
            if (hashedCode !== verification.otp!.code) {
                // Increment attempts
                await this.verificationRepository.incrementAttempts(reference);
                throw new ValidationError('Invalid verification code');
            }
        }   

            await this.verificationRepository.update(verification._id!, { status: VerificationStatus.COMPLETED });
            const updatedUser: IUser = await this.userRepository.update(user._id!, { status: UserStatus.ACTIVE });

            if(!updatedUser) throw new AppError("Failed to update user status", 500);

            const { accessToken, refreshToken } = await this.tokenService.generateTokens(updatedUser);

            await this.commitTransaction();

            return { accessToken, refreshToken, user: this.authHelpers.constructUserObject(updatedUser) };
        } catch (error: any) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "phone verification");
        }
    }
    
    /**
     * @inheritdoc
     */
    async preSignUpEmailInit(dto: EmailSignUpDTO, salt?: string): Promise<IEmailVerificationResponse> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            await this.authHelpers.ensureUserDoesNotExistByEmail(dto.email);
            await this.authHelpers.handleExistingEmailVerification(dto.email);
           
            const verificationCode = UtilityService.generate4Digit();
            const generatedSalt = salt || CryptoService.generateValidSalt();
           
            Console.write("Verification code: " + verificationCode);
            const userEntity = await User.createFromEmail(dto.email);
            if (!userEntity) throw new AppError("Failed to create user object", 500);
            
            userEntity.salt = generatedSalt;

            Console.write("User entity: " + userEntity);
            const newUser = await this.userRepository.create(userEntity);

            Console.write("New user: " + newUser);
            const verification = await this.authHelpers.createEmailVerificationRecord(newUser._id!, dto.email, verificationCode, generatedSalt);

            await this.emailService.sendOTPEmail({ email: dto.email, otpCode: verificationCode, userId: newUser._id! });
            
            await this.commitTransaction();

            return this.authHelpers.formatEmailVerificationResponse(verification);

        } catch (error: any) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "email initiation");
        }
    }
    

    /**
     * @inheritdoc
     */
    async verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verification = await this.verificationRepository.findByReference(data.reference);
            console.log("RegistrationService::verifyEmailCode(): => Verification Object: ", verification);
            // Check valid verification record
            if (!verification || verification.type !== VerificationType.EMAIL || verification.identifier !== data.email) {
                 throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            // Check verification status
            if(verification.status === VerificationStatus.COMPLETED) {
                throw new UnprocessableEntityError(ResponseMessage.EMAIL_VERIFICATION_ALREADY_COMPLETED);
            }

            // Check verification expiry
            if (this.authHelpers.isVerificationExpired(verification.expiry!)) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            if(this.authHelpers.isVerificationExpired(verification.otp.expiry!)) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION_CODE);
            }

            // Check verification attempts
            if (verification.attempts >= 3) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            const user = await this.userRepository.findById(verification.user_id!);
            if (!user) throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);

            console.log("data from dto: ", data);
           // to verify the OTP Code hash
            const currentTime = UtilityService.dateToUnix(new Date());
            
            // In non-production environments '1234' is always valid
            if (!EnvironmentConfig.isProduction() && data.code === '1234') {
                // Code is valid, continue with verification
            } else {
                // Verify the code using hash comparison
                const hashedCode = await CryptoService.hashString(data.code, user.salt as string);
                
                if (hashedCode !== verification.otp.code) {
                    // Increment attempts
                    await this.verificationRepository.incrementAttempts(data.reference);
                    throw new ValidationError(ResponseMessage.INVALID_VERIFICATION_CODE);
                }
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

            await this.verificationRepository.update(verification._id!, { status: VerificationStatus.COMPLETED });
            const updatedUser = await this.userRepository.update(user._id!, { 
                status: UserStatus.VERIFIED, 
                email_verified: true 
            }) as IUser;

            const { accessToken, refreshToken } = await this.tokenService.generateTokens(updatedUser);
            
            await this.commitTransaction();

            return { accessToken, refreshToken, user: this.authHelpers.constructUserObject(updatedUser) };
        } catch (error: any) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "email verification");
        }
    }
    
    
    /**
     * @inheritdoc
     */
    async resendVerification(phoneNumber: string, reference: string): Promise<any> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== phoneNumber) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }
             if (verification.status === VerificationStatus.COMPLETED) {
                throw new ConflictError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }

            const user = await this.userRepository.findById(verification.user_id!);
            if(!user) throw new UnprocessableEntityError(ResponseMessage.USER_NOT_FOUND_MESSAGE);

            const newOtpCode = UtilityService.generate4Digit();
            const hashedOtp = await CryptoService.hashString(newOtpCode, user.salt);
            
            verification.otp!.code = hashedOtp;
            verification.otp!.expiry = UtilityService.dateToUnix(Date.now() + 10 * 60 * 1000);
            verification.otp!.attempts = 0;

            await this.verificationRepository.update(verification._id!, { otp: verification.otp });

            await this.smsService.sendVerificationSMS({
                recipient: phoneNumber,
                message: `Your new verification code is ${newOtpCode}`
            });

            await this.commitTransaction();
            return {
                message: `A new verification code has been sent to your phone.`,
                reference: verification.reference,
                expiry: verification.otp!.expiry
            };

        } catch(error){
             if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "resend OTP");
        }
    }

    /**
     * @inheritdoc
     */
    async handleExpiredVerification(phoneNumber: string): Promise<any> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verifications = await this.verificationRepository.findByCondition({
                identifier: phoneNumber,
                type: VerificationType.PHONE,
                status: VerificationStatus.PENDING
            });

            if (verifications.length === 0) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            for (const verification of verifications) {
                await this.verificationRepository.update(verification._id!, { status: VerificationStatus.EXPIRED });
            }

            await this.commitTransaction();
            return { success: true, message: "Previous verification attempts have been marked as expired." };
        } catch (error: any) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "handle expired verification");
        }
    }


    /**
     * @inheritdoc
     */
    async setupPassword(phone: string, password: string, token: string): Promise<UserResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const user = await this.userRepository.findByPhone(phone);
            if (!user) throw new UnprocessableEntityError(ResponseMessage.USER_NOT_FOUND_MESSAGE);

            const verification = await this.verificationRepository.findByReference(token);
            if (!verification || verification.user_id !== user._id || verification.status !== VerificationStatus.COMPLETED) {
                throw new AuthenticationError(ResponseMessage.INVALID_VERIFICATION);
            }
            
            const hashedPassword = await CryptoService.hashString(password, user.salt);
            const updatedUser = await this.userRepository.update(user._id!, { password: hashedPassword });

            if(!updatedUser) throw new AppError("Failed to update user password", 500);

            await this.commitTransaction();
            return this.authHelpers.constructUserObject(updatedUser);
        } catch(error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "password setup");
        }
    }

    /**
     * @inheritdoc
     */
    async setupEmailPassword(email: string, password: string, reference: string): Promise<UserResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const user = await this.userRepository.findByEmail(email);
            if (!user) throw new UnprocessableEntityError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            
            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.user_id !== user._id || verification.status !== VerificationStatus.COMPLETED) {
                 throw new AuthenticationError(ResponseMessage.INVALID_VERIFICATION);
            }

            const hashedPassword = await CryptoService.hashString(password, user.salt);
            const updatedUser = await this.userRepository.update(user._id!, { password: hashedPassword });

            if(!updatedUser) throw new AppError("Failed to update user password", 500);
            
            await this.commitTransaction();
            return this.authHelpers.constructUserObject(updatedUser);
        } catch(error) {
             if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "email password setup");
        }
    }
    
    /**
     * @inheritdoc
     */
    async resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== email) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }
            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ConflictError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }

            const user = await this.userRepository.findById(verification.user_id!);
            if(!user) throw new UnprocessableEntityError(ResponseMessage.USER_NOT_FOUND_MESSAGE);

            const newOtpCode = UtilityService.generate4Digit();
            const hashedOtp = await CryptoService.hashString(newOtpCode, user.salt);
            
            verification.otp!.code = hashedOtp;
            verification.otp!.expiry = UtilityService.dateToUnix(Date.now() + 30 * 60 * 1000);
            verification.otp!.attempts = 0;

            await this.verificationRepository.update(verification._id!, { otp: verification.otp });

            await this.emailService.sendOTPEmail({ 
                email: email, 
                otpCode: newOtpCode, 
                userId: user._id!,
                otpExpiry: 30 
            });

            await this.commitTransaction();
            return this.authHelpers.formatEmailVerificationResponse(verification);
        } catch(error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "resend email verification");
        }
    }

    /**
     * @inheritdoc
     */
    async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            if (dto.email) {
                await this.authHelpers.ensureUserDoesNotExistByEmail(dto.email);
            }
            
            if (dto.phone) {
                await this.authHelpers.ensureUserDoesNotExistByPhone(dto.phone);
            }

            const salt = CryptoService.generateValidSalt();
            const userEntity = await User.createFromDTO(dto) as IUser;
            
            
            
            const newUser = await this.userRepository.create(userEntity);
            
            await this.commitTransaction();
            
            return this.authHelpers.constructUserObject(newUser);
        } catch(error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "user creation");
        }
    }
    
    /**
     * Placeholder for Host Onboarding. This is a separate, more complex business process
     * that should live in its own dedicated service.
     */
    async onboardNewHost(dto: any, adminUserId: string): Promise<UserResponseDTO> {
        // This logic belongs in a future HostService or similar
        throw new Error("Method not implemented.");
    }
    


    // Private helper methods
    private _handleRegistrationError(error: any, context: string): never {
        Console.error(error, { message: `RegistrationService failed during ${context}`, context: 'RegistrationService' });
        if (error instanceof ValidationError || error instanceof UnprocessableEntityError || error instanceof AuthenticationError) {
            throw error;
        }
        throw new AppError(`An unexpected error occurred during ${context}. Please try again later.`, 500);
    }
    
    /**
     * @inheritdoc
     */
    async verifyOTPCode(reference: string, otpCode: string, salt: string): Promise<any> {
        return this.verifyPhoneOtp(reference, otpCode, "");
    }


    //=======================================//
    // CONSOLIDATED APP
    //=======================================//

    /**
     * @inheritdoc
     */
    async initRegistration(dto: RegisterUserDTOV2): Promise<UserResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();
        
            // Check if email is already registered
            const existingUser = await this.userRepository.findByEmail(dto.email);
            if (existingUser) {
                if (!existingUser.roles.includes(dto.role as UserRole)) {
                    throw new ValidationError("User already exists but with a different account, to get started, go on with the onboarding process");
                } else {
                    throw new ValidationError("User with this email already exists");
                }
            }

            // Generate salt for password hashing
            const generatedSalt = CryptoService.generateValidSalt();
            
            // Create user object
            const userObject = await User.createFromRegisterUserDTO(dto) as IUser;
            if (!userObject) {
                throw new InternalServerError("Failed to create user object");
            }
            
            // Hash the password
            userObject.password = await CryptoService.hashString(dto.password, generatedSalt);
            userObject.salt = generatedSalt;
            
            Console.write("Creating user with data: " + JSON.stringify({
                email: userObject.email,
                first_name: userObject.first_name,
                last_name: userObject.last_name,
                roles: userObject.roles
            }));
            
            // Create the user in the database
            const user = await this.userRepository.create(userObject);
            if (!user || !user._id) {
                throw new InternalServerError("Failed to create user in database");
            }
            
            Console.write("User created with ID: " + user._id);
            
            // Generate verification code
            const code = UtilityService.generate4Digit();
            
            // Create email verification record with the user ID
            const verification = await this.authHelpers.createEmailVerificationRecord(
                user._id, 
                dto.email, 
                code, 
                generatedSalt
            );
            
            if (!verification) {
                throw new InternalServerError("Failed to create verification record");
            }
            
            // Send verification email
            await this.emailService.sendOTPEmail({ 
                firstName: dto.first_name,
                email: dto.email, 
                otpCode: code, 
                userId: user._id, 
                otpExpiry: 10 
            });
            
            await this.commitTransaction();
            const response = this.authHelpers.constructUserObject(user);    
            response.reference = verification.reference;
            response.expiry = verification.otp!.expiry;
            return response;
        } catch(error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "init registration");
        }
    }

    async verifyEmail (reference: string, otpCode: string, email: string): Promise<any> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();
            console.log("RegistrationService::verifyEmail(): => Reference: ", reference);
            const verification = await this.verificationRepository.findByReference(reference);
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_YOURE_TRYING_TO_VERIFY_DOES_NOT_EXIST);
            }
            console.log("User from verification record: ", user);
            console.log("Verification from verification record: ", verification);
            if (!verification) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            console.log("RegistrationService::verifyEmailCode(): => Verification Object: ", verification);
            // Check valid verification record
            if (!verification || verification.type !== VerificationType.EMAIL || verification.identifier !== email) {
                 throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            // Check verification status
            if(verification.status === VerificationStatus.COMPLETED) {
                throw new UnprocessableEntityError(ResponseMessage.EMAIL_VERIFICATION_ALREADY_COMPLETED);
            }

            // Check verification expiry
            if (this.authHelpers.isVerificationExpired(verification.expiry!)) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            if(this.authHelpers.isVerificationExpired(verification.otp.expiry!)) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION_CODE);
            }

            // Check verification attempts
            if (verification.attempts >= 3) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            if (!user) {
                throw new NotFoundError("User not found");
            }
            
            if (!EnvironmentConfig.isProduction() && otpCode === '1234') {
                // Code is valid, continue with verification
            } else {
                // Verify the code using hash comparison
                const isVerified = await CryptoService.verifyHash(otpCode, verification.otp!.code, user.salt);
                
                if (!isVerified) {
                    // Increment attempts
                    await this.verificationRepository.incrementAttempts(reference);
                    throw new ValidationError(ResponseMessage.INVALID_VERIFICATION_CODE);
                }
            }   
            verification.otp!.verified = true;
            await this.verificationRepository.update(verification._id!, { otp: verification.otp });
            const updateObject = {
                status: UserStatus.ACTIVE,
            }
            const updatedUser = await this.userRepository.update(user._id!, updateObject);
            if(updatedUser.roles.includes(UserRole.RENTER, UserRole.HOST)){
                console.log("User updated: ", updatedUser)
                const userKYCObject: IUserKYC = {
                    user_id: updatedUser._id as string,
                    current_stage: KYCStage.EMAIL_VERIFICATION,
                    status: KYCStatus.IN_PROGRESS,
                    last_updated: UtilityService.formatDateToUrlSafeISOFormat(new Date()),
                    failure_reason: null,
                    stage_metadata: {}
                };
                console.log("User KYC Object: ", userKYCObject)
                await this.userKYCRepository.create(userKYCObject);
            }
            if(transactionStarted) await this.commitTransaction();

            const response = this.authHelpers.constructUserObject(updatedUser);
            const {accessToken, refreshToken} = await this.tokenService.generateTokens(updatedUser);
            return {accessToken, refreshToken, user: response};
        }catch(error: any){
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "verify email");
        }
    }

    // private async createUser(dto: RegisterUserDTOV2): Promise<UserResponseDTO> {
    //     const userDTO: CreateUserDTO = {
    //         email: dto.email,
    //         phone: "",
    //         password: dto.password,
    //         roles: [dto.role as UserRole],
    //     } 
    //     const userEntity = await User.createFromDTO(dto) as IUser;
    //     return this.userRepository.create(userEntity);
    // }


    // /**
    //  * 
    //  */
    // async verifyEmail(dto: VerifyEmailDTO): Promise<UserResponseDTO> {
    //     return {} as UserResponseDTO;
    // }

    // /**
    //  * 
    //  */
    // async login(dto: LoginDTO): Promise<UserResponseDTO> {
    //     return {} as UserResponseDTO;
    // }

    // /**
    //  * 
    //  */
    async logout(): Promise<UserResponseDTO> {
        return {} as UserResponseDTO;
    }
}
