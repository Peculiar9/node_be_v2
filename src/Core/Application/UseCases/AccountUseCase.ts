import { inject, injectable } from 'inversify';
import { TYPES } from '../../Types/Constants';
import { IAccountUseCase } from '../Interface/UseCases/IAccountUseCase';
import { PhoneSignUpDTO, VerifyOTPDTO, SetupPasswordDTO, RegisterUserDTO, EmailSignUpDTO, VerifyEmailDTO, IEmailVerificationResponse, EmailSetupPasswordDTO } from '../DTOs/AuthDTO';
import { UserResponseDTO, UpdateUserDTO, CreateUserDTO } from '../DTOs/UserDTO';
import { UserRole } from '../Enums/UserRole';
import { ResponseMessage } from '../Response/ResponseFormat';
import { LoginResponseDTO } from '../DTOs/AuthDTO';
import { ISMSService } from '../Interface/Services/ISMSService';
import { UtilityService } from '../../../Core/Services/UtilityService';
import CryptoService from '../../../Core/Services/CryptoService';
import { IVerification } from '../Interface/Entities/auth-and-user/IVerification';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { IGoogleService } from '../Interface/Services/IGoogleService';
import { IUser, OAuthProvider } from '../Interface/Entities/auth-and-user/IUser';
import { AppError, AuthenticationError, ValidationError, UnprocessableEntityError, ServiceError } from '../Error/AppError';
import { OAuthUserData } from '../Interface/Entities/auth-and-user/IUser';
import { Console, LogLevel } from '../../../Infrastructure/Utils/Console';
import { UserStatus } from '../Enums/UserStatus';
import { IAuthenticationService } from '../Interface/Services/IAuthenticationService';
import { IRegistrationService } from '../Interface/Services/IRegistrationService';
import { IUserProfileService } from '../Interface/Services/IUserProfileService';

@injectable()
export class AccountUseCase implements IAccountUseCase {
    constructor(
        @inject(TYPES.AuthenticationService) private readonly _authenticationService: IAuthenticationService,
        @inject(TYPES.RegistrationService) private readonly _registrationService: IRegistrationService,
        @inject(TYPES.UserProfileService) private readonly _userProfileService: IUserProfileService,
        @inject(TYPES.SMSService) private readonly _smsService: ISMSService,
        @inject(TYPES.GoogleService) private readonly _googleService: IGoogleService,
    ) {}
  
    async updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO> {
       return await this._userProfileService.updateProfileImage(image, user);
    }

    async resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse> {
    return await this._registrationService.resendEmailVerification(email, reference);
  }

   async removeUser(email: string): Promise<UserResponseDTO | undefined> {
        return await this._userProfileService.removeUser(email);
    }
    
    async verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO> {
        try {
            Console.info("AccountUseCase::verifyEmailCode -> Verifying email code", { data });

            if (!data || !data.email || !data.code || !data.reference) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const result = await this._registrationService.verifyEmailCode(data);
            return result;
        } catch (error: any) {
            Console.error(error, { message: 'Failed to verify email code' });
            if (error instanceof ValidationError || error instanceof UnprocessableEntityError) {
                throw error;
            }
            throw new ServiceError(ResponseMessage.EMAIL_VERIFICATION_FAILED);
        }
    }

    async preSignUpEmail(data: EmailSignUpDTO): Promise<IEmailVerificationResponse> {
        try {
            const salt = CryptoService.generateValidSalt();
            Console.info("AccountUseCase::preSignUpEmail -> Starting email pre-signup process: data", { data });
            Console.info("AccountUseCase::preSignUpEmail -> Starting email pre-signup process salt:", { salt });
            if (!data || !data.email) {
                throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
            }

            // Email validation is handled by class-validator in EmailSignUpDTO
            const result = await this._registrationService.preSignUpEmailInit(data, salt);
            return result;
        } catch (error: any) {
            Console.error(error, { message: 'Failed to initiate email signup' });
            if (error instanceof ValidationError || error instanceof UnprocessableEntityError) {
                throw error;
            }
            throw new ServiceError(ResponseMessage.EMAIL_VERIFICATION_FAILED);
        }
    }

    async preSignUpPhone(data: PhoneSignUpDTO): Promise<any> {
        try {
            Console.info("AccountUseCase::preSignUpPhone -> Starting pre-signup process", { data });

            if (!data) {
                throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
            }

            const { international_phone, country_code } = data;
            if (!international_phone || !country_code) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const cleanPhone = data.international_phone?.replace(/\D/g, '');
            const phoneNumber = this.validateAndFormatPhoneNumber(country_code + cleanPhone);
            
            if (!phoneNumber) {
                throw new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);
            }

            const otpCode = UtilityService.generate4Digit();
            const salt = CryptoService.generateValidSalt();

            const verificationResult = await this._registrationService.preSignUpPhoneInit(phoneNumber, otpCode, salt);
            if (!verificationResult) {
                throw new ServiceError('Failed to initialize verification process');
            }

            const smsData = {
                recipient: phoneNumber,
                message: `Your verification code is ${otpCode}`,
                attributes: {
                    datatype: 'string',
                    value: 'transactional'
                }
            };

            const smsResult = await this._smsService.sendVerificationSMS(smsData);
            const otpSent = smsResult?.$metadata?.httpStatusCode === 200;
            
            if (!otpSent) {
                throw new ServiceError(ResponseMessage.VERIFICATION_FAILED);
            }

            Console.info("AccountUseCase::preSignUpPhone -> Verification initiated successfully", {
                phoneNumber,
                reference: verificationResult.reference
            });

            return {
                message: `We have sent an otp to *** *** *** ${phoneNumber.slice(-2)}`,
                token: verificationResult.reference,
                expiry: verificationResult.expiry,
                phone: phoneNumber
            };
        } catch (error: any) {
            const appError = error instanceof AppError 
                ? error 
                : new ServiceError(`Failed to process pre-signup: ${error.message}`);
            Console.error(appError, {
                data,
                context: 'preSignUpPhone'
            });

            throw appError;
        }
    }

    private validateAndFormatPhoneNumber(phoneNumber: string): string | null {
        try {
            const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber);
            if (!parsedPhoneNumber || !parsedPhoneNumber.isValid()) {
                throw new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);
            }

            return parsedPhoneNumber.format('E.164');
        } catch (error: any) {
            const appError = error instanceof AppError
                ? error
                : new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);

            Console.error(appError, {
                phoneNumber,
                context: 'validateAndFormatPhoneNumber'
            });

            throw appError;
        }
    }

    async verifyPhone(data: VerifyOTPDTO): Promise<LoginResponseDTO> {
        try {
            Console.info("AccountUseCase::verifyPhone -> Starting phone verification", { data });

            if (!data) {
                throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
            }

            const { code, token, country_code, international_phone } = data;
            if (!code || !token || !country_code || !international_phone) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const phoneNumber = this.validateAndFormatPhoneNumber(country_code + international_phone);
            if (!phoneNumber) {
                throw new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);
            }

            const result = await this._registrationService.verifyOTPCode(token, code, phoneNumber);
            
            Console.info("AccountUseCase::verifyPhone -> Phone verification successful", {
                phoneNumber,
                token
            });

            return result;
        } catch (error: any) {
            const appError = error instanceof AppError
                ? error
                : new ServiceError(`Failed to verify phone: ${error.message}`);

            Console.error(appError, {
                data,
                context: 'verifyPhone'
            });

            throw appError;
        }
    }

    async resendVerification(data: VerifyOTPDTO): Promise<any> {
        try {
            Console.info("AccountUseCase::resendVerification -> Starting verification resend", { data });

            if (!data) {
                throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
            }

            const { international_phone, country_code, token } = data;
            if (!international_phone || !country_code || !token) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const cleanPhone = data.international_phone?.replace(/\D/g, '');
            const phoneNumber = this.validateAndFormatPhoneNumber(country_code + cleanPhone);
            
            if (!phoneNumber) {
                throw new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);
            }

            const verification = await this._registrationService.resendVerification(phoneNumber, token);
            if (!verification) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            const otpCode = UtilityService.generate4Digit();
            const smsData = {
                recipient: verification.phone,
                message: `Your verification code is ${otpCode}`,
                attributes: {
                    datatype: 'string',
                    value: 'transactional'
                }
            };

            const smsResult = await this._smsService.sendVerificationSMS(smsData);
            const otpSent = smsResult?.$metadata?.httpStatusCode === 200;
            
            if (!otpSent) {
                throw new ServiceError(ResponseMessage.VERIFICATION_FAILED);
            }

            Console.info("AccountUseCase::resendVerification -> Verification resent successfully", {
                phoneNumber,
                reference: verification.reference
            });

            return {
                message: `We have sent an otp to *** *** *** ${verification.phone.slice(-2)}`,
                token: verification.reference,
                expiry: verification.expiry,
                phone: verification.phone
            };
        } catch (error: any) {
            const appError = error instanceof AppError
                ? error
                : new ServiceError(`Failed to resend verification: ${error.message}`);

            Console.error(appError, {
                data,
                context: 'resendVerification'
            });

            throw appError;
        }
    }

    async handleExpiredVerification(phoneNumber: string): Promise<any> {
        try {
            Console.info("AccountUseCase::handleExpiredVerification -> Handling expired verification", { phoneNumber });

            if (!phoneNumber) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const formattedPhone = this.validateAndFormatPhoneNumber(phoneNumber);
            if (!formattedPhone) {
                throw new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);
            }

            const result = await this._registrationService.handleExpiredVerification(formattedPhone);
            
            Console.info("AccountUseCase::handleExpiredVerification -> Expired verification handled successfully", {
                phoneNumber: formattedPhone
            });

            return result;
        } catch (error: any) {
            const appError = error instanceof AppError
                ? error
                : new ServiceError(`Failed to handle expired verification: ${error.message}`);

            Console.error(appError, {
                phoneNumber,
                context: 'handleExpiredVerification'
            });

            throw appError;
        }
    }

    async oauth(data: OAuthUserData): Promise<any> {
        try {
            Console.info("AccountUseCase::oauth -> Starting OAuth process", { 
                provider: data.provider,
                email: data.email
            });

            if (!data.email || !data.provider) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const createUserDTO: CreateUserDTO = {
                email: data.email,
                first_name: data.name.split(' ')[0],
                last_name: data.name.split(' ')[1] || '',
                phone: data.phone || "",
                password: "",
                roles: [],
                provider: data.provider,
                provider_id: data.id
            };

            const userResponse = await this._authenticationService.oauth(createUserDTO);
            
            Console.info("AccountUseCase::oauth -> OAuth process completed successfully", {
                provider: data.provider,
                email: data.email
            });

            return userResponse;
        } catch (error: any) {
            const appError = error instanceof AppError
                ? error
                : new ServiceError(`Failed to process OAuth: ${error.message}`);

            Console.error(appError, {
                provider: data.provider,
                email: data.email,
                context: 'oauth'
            });

            throw appError;
        }
    }

    private async handleGoogleOAuthUser(userData: any): Promise<LoginResponseDTO | undefined> {
        const {access_token} = await this._googleService.getAccessToken(userData.code);
        const user = await this._googleService.getUserProfile(access_token);
        if (!user) {
            throw new AuthenticationError('Failed to get Google user profile');
        }
        
        // Create new user if not exists
        const newUser: CreateUserDTO = this.buildGoogleUser(userData);
        const userResponse = await this._authenticationService.oauth(newUser);
        return userResponse;
    }
    private async handleFacebookOAuthUser(userData: any): Promise<LoginResponseDTO | undefined> {
        //TODO
        // Create new user if not exists
        const newUser: CreateUserDTO = this.buildFacebookUser(userData);
        const userResponse = await this._authenticationService.oauth(newUser);
        return userResponse;
    }

    private async handleAppleOAuthUser(userData: any): Promise<LoginResponseDTO | undefined> {
        // Create new user if not exists
        const newUser: CreateUserDTO = this.buildAppleUser(userData);
        const userResponse = await this._authenticationService.oauth(newUser);
        return userResponse;
    }
 //TODO complete this
    private buildGoogleUser(userData: any): CreateUserDTO {
        return {
            email: userData.email,
            phone: userData.phone || "",
            first_name: userData.given_name,
            last_name: userData.family_name,
            password: '', // OAuth users don't need passwords
            profile_image: userData.picture,
            roles: [UserRole.USER],
            provider: OAuthProvider.GOOGLE,
            provider_id: userData.sub
        };
    }

    private buildFacebookUser(userData: any): CreateUserDTO {
        return {
            email: userData.email,
            phone: userData.phone || "",
            first_name: userData.first_name,
            last_name: userData.last_name,
            password: '', // OAuth users don't need passwords
            profile_image: userData.picture?.data?.url,
            roles: [UserRole.USER],
            provider: OAuthProvider.FACEBOOK,
            provider_id: userData.id
        };
    }

    private buildAppleUser(userData: any): CreateUserDTO {
        return {
            email: userData.email,
            phone: userData.phone || "",
            first_name: userData.firstName || '',
            last_name: userData.lastName || '',
            password: '', // OAuth users don't need passwords
            profile_image: '',
            roles: [UserRole.USER],
            provider: OAuthProvider.APPLE,
            provider_id: userData.sub
        };
    }
 
    async getAllUsers(): Promise<UserResponseDTO[]> {
        // This should be admin-only operation
        // return await this._authService.getAllUsers();
        throw new Error("Not implemented yet");
    }

    async createAdmin(dto: CreateUserDTO): Promise<UserResponseDTO> {
        if (!dto) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }
        
        dto.roles = [UserRole.ADMIN];
        return await this._registrationService.createUser(dto) as UserResponseDTO;
    }

    async register(dto: RegisterUserDTO, user: IUser): Promise<UserResponseDTO> {
       if(!dto){
         throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
       }
       console.log("AccountUseCase::register -> ", {dto});

       // Check if user profile already exists and is set up
       if(user.status === UserStatus.ACTIVE){
         throw new ValidationError('Profile already exists. Please use the profile management section to update your details.');
       }

       if (dto.dob) {
         const dobDate = new Date(dto.dob);
         const today = new Date();
         const ageDifference = today.getFullYear() - dobDate.getFullYear();
         const hasBirthdayOccurred = (
           today.getMonth() > dobDate.getMonth() || 
           (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate())
         );
         const age = hasBirthdayOccurred ? ageDifference : ageDifference - 1;
         
         if (age < 18) {
           throw new ValidationError('User must be at least 18 years old');
         }
       }

       let genderValue = '';
       if (dto.gender) {
         const normalizedGender = dto.gender.toLowerCase();
         if (normalizedGender === 'm' || normalizedGender === 'male') {
           genderValue = 'male';
         } else if (normalizedGender === 'f' || normalizedGender === 'female') {
           genderValue = 'female';
         } else if (normalizedGender === 'o' || normalizedGender === 'other' || normalizedGender === 'others') {
           genderValue = 'others';
         } else {
            
           throw new ValidationError('Gender must be one of: male, female, others');
         }
       }

       console.log("AccountUseCase::register:: userSalt: ", user.salt);
       const hashedPassword = await CryptoService.hashString(dto.password as string, user.salt);
       const cleanedPhoneNumber = dto.country_code + dto.international_phone;
       const validatedPhoneNumber = this.validateAndFormatPhoneNumber(cleanedPhoneNumber) as string;
       const updateUserDTO: UpdateUserDTO = {
         first_name: dto.full_name.split(' ')[0],
         last_name: dto.full_name.split(' ').slice(1).join(' '),
         dob: dto.dob ? new Date(dto.dob).toISOString() : undefined,
         gender: genderValue || undefined,
         international_phone: dto.international_phone,
         country_code: dto.country_code,
         phone: validatedPhoneNumber,
        //  email: dto?.email || undefined ,
         location: dto.address,
         password: hashedPassword
       };
       console.log("Register Updated User DTO: ", updateUserDTO);
       const result = await this._userProfileService.updateUser(user._id as string, updateUserDTO, user);
       return result as UserResponseDTO;
    }

    async login(phone: string, password: string): Promise<any> {
        console.log("Got here!!!", {phone}, {password});
        phone = phone.replace(/\s/g, '');

        // Validate inputs
        if (!phone || !password) {
            throw new ValidationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
        }

        return this._authenticationService.authenticate(phone, password);
    }
// 
    async loginV2(identifier: string, password: string): Promise<LoginResponseDTO | undefined> {
        console.log("Got here!!!", {identifier}, {password});
        identifier = identifier.replace(/\s/g, '');

        // Validate inputs
        if (!identifier || !password) {
            throw new ValidationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
        }

        return this._authenticationService.authenticate(identifier, password);
    }
    
    async updateProfile(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO> {
        if (!userId || !dto) {
            throw new ValidationError(ResponseMessage.INVALID_UPDATE_REQUEST);
        }

        const user = existingUser || await this._userProfileService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        // Update user profile through user profile service
        const updatedUser = await this._userProfileService.updateUser(userId, dto, existingUser);
        return updatedUser as UserResponseDTO;
    }

    async getUserProfile(userId: string): Promise<UserResponseDTO> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        const user = await this._userProfileService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        return user;
    }

    async verifyEmail(token: string): Promise<boolean> {
        if (!token) {
            throw new ValidationError(ResponseMessage.VERIFICATION_TOKEN_REQUIRED);
        }

        // Verify email token through authentication service
        const isVerified = await this._authenticationService.verifyToken(token);
        return isVerified;
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }

        // Request password reset through authentication service
        await this._authenticationService.requestPasswordReset(email);
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        if (!token || !newPassword) {
            throw new ValidationError(ResponseMessage.TOKEN_PASSWORD_REQUIRED);
        }

        // Reset password through authentication service
        return await this._authenticationService.resetPassword(token, newPassword);
    }

    async refreshToken(refreshToken: string): Promise<{ user: UserResponseDTO; accessToken: string; refreshToken: string }> {
        // Get new access token using refresh token
        const result = await this._authenticationService.refreshAccessToken(refreshToken);
        const userRespose = this.constructUserObject(result.user);
        return { user: userRespose, accessToken: result.accessToken, refreshToken: result.refreshToken };
    }

    async refresh(user: IUser, token: string): Promise<{ user: UserResponseDTO; token: string }> {
        if (!user || !token) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }

        // Refresh token through authentication service
        const result = await this._authenticationService.refreshAccessToken(user._id as string);
        const userRespose = this.constructUserObject(user);
        return { user: userRespose, token: result.accessToken };
    }

      //TODO: Move this to the DTO layer for mapping. 
      private constructUserObject(user: IUser): UserResponseDTO {
        return {
            id: user._id as string,
            first_name: user.first_name as string,
            last_name: user.last_name as string,
            email: user.email as string,
            phone: user.phone as string,
            profile_image: user.profile_image as string,
            roles: user.roles as UserRole[],
            status: user.status as string,
            is_active: user.is_active as boolean,
            created_at: user.created_at as string,
            updated_at: user.updated_at as string,
        };
    }

    async logout(userId: string): Promise<void> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        // Revoke refresh token through authentication service
        await this._authenticationService.revokeRefreshToken(userId);
    }

    async setupEmailPassword(dto: EmailSetupPasswordDTO): Promise<UserResponseDTO> {
        return await this._registrationService.setupEmailPassword(dto.email, dto.password, dto.reference);
    }

    async setupPassword(dto: SetupPasswordDTO): Promise<UserResponseDTO> {
        if (!dto) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }

        // Delegate to registration service
        const user = await this._registrationService.setupPassword(
            dto.international_phone,
            dto.password,
            dto.token
        );

       return user;
    }

    async decodeToken(token: string): Promise<any> {
        return await this._authenticationService.verifyToken(token);
    }

    async requestPasswordResetOTP(email: string): Promise<void> {
        return await this._authenticationService.requestPasswordResetOTP(email);
    }
    async resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean> {
        return await this._authenticationService.resetPasswordWithOtp(email, otp, newPassword);
    }

}