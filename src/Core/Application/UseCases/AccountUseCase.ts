import { inject, injectable } from 'inversify';
import { TYPES } from '../../Types/Constants';
import { IAuthService } from '../Interface/Services/IAuthService';
import { IAccountUseCase } from '../Interface/UseCases/IAccountUseCase';
import { PhoneSignUpDTO, VerifyOTPDTO, SetupPasswordDTO, RegisterUserDTO } from '../DTOs/AuthDTO';
import { UserResponseDTO, UpdateUserDTO, CreateUserDTO } from '../DTOs/UserDTO';
import { UserRole } from '../Enums/UserRole';
import { ResponseMessage } from '../Response/ResponseFormat';
import { LoginResponseDTO } from '../DTOs/AuthDTO';
import { ISMSService } from '../Interface/Services/ISMSService';
import { UtilityService } from '../../../Core/Services/UtilityService';
import  CryptoService  from '../../../Core/Services/CryptoService';
import { IVerification } from '../Interface/Entities/auth-and-user/IVerification';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { IGoogleService } from '..//Interface/Services/IGoogleService';
import { IUser, OAuthProvider } from '../Interface/Entities/auth-and-user/IUser';
import { AuthenticationError, ValidationError } from '../Error/AppError';
import { OAuthUserData } from '../Interface/Entities/auth-and-user/IUser';
import { Console } from '../../../Infrastructure/Utils/Console';

@injectable()
export class AccountUseCase implements IAccountUseCase {
    constructor(
        @inject(TYPES.AuthService) private readonly _authService: IAuthService,
        @inject(TYPES.SMSService) private readonly _smsService: ISMSService,
        @inject(TYPES.GoogleService) private readonly _googleService: IGoogleService,
    ) {}

    async preSignUpPhone(data: PhoneSignUpDTO): Promise<any> {
        console.log("AccountUseCase::preSignUpPhone -> ", {data});
            if (!data) {
                throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
            }
            const { international_phone, country_code } = data;
            if (!international_phone || !country_code) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }
            console.log("Before presignup init");
            // does the initial user check
            data.international_phone = data.international_phone?.replace(/\D/g, '');
            const phoneNumber = this.validateAndFormatPhoneNumber(data.country_code + data.international_phone) as string;
            console.log("AccountUseCase::preSignUpPhone -> ", { phoneNumber });
            const otpCode = UtilityService.generate4Digit();
            const salt = CryptoService.generateValidSalt();
            const verificationResult: IVerification = await this._authService.preSignUpPhoneInit(phoneNumber, otpCode, salt);
            const smsData = {
                recipient: phoneNumber,
                message: `Your verification code is ${otpCode}`,
                attributes: {
                    datatype: 'string',
                    value: 'transactional'
                }
            }

            const smsResult = await this._smsService.sendVerificationSMS(smsData);
            Console.info("AccountUseCase::presignUpPhone after verification result", { data: data, otpCode, phoneNumber });
            const otpSent = smsResult?.$metadata?.httpStatusCode === 200;
            if (!otpSent) {
                throw new AuthenticationError(ResponseMessage.VERIFICATION_FAILED);
            }
            console.log("AccountUseCase::presignUpPhone verificationResult", { verificationResult });
            return {
                message: `We have sent an otp to *** *** *** ${(phoneNumber as string).slice(-2)}`,
                token: verificationResult.reference,
                expiry: verificationResult.expiry,
                phone: phoneNumber
            }
    }

    private validateAndFormatPhoneNumber(phoneNumber: string): string | null {
        const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber);
        if (!parsedPhoneNumber || !parsedPhoneNumber.isValid()) {
            throw new ValidationError(ResponseMessage.INVALID_PHONE_NUMBER);
        }

        return parsedPhoneNumber.format('E.164');
    }

    async verifyPhone(data: VerifyOTPDTO): Promise<LoginResponseDTO> {
        if (!data) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }
        const { code, token, country_code, international_phone } = data;
        const phoneNumber: string = this.validateAndFormatPhoneNumber(country_code+international_phone) as string;
        if (!code || !token) {
            throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
        }
        return await this._authService.verifyOTPCode(token, code, phoneNumber);
    }

    async resendVerification(data: VerifyOTPDTO): Promise<any> {
        if(!data){
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }
        const { international_phone, country_code, token } = data;
        if (!international_phone || !country_code) {
            throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
        }
        console.log("Before presignup init");
        // does the initial user check
        data.international_phone = data.international_phone?.replace(/\D/g, '');
        const phoneNumber = this.validateAndFormatPhoneNumber(data.country_code + data.international_phone) as string;
        console.log("AccountUseCase::preSignUpPhone -> ", { phoneNumber });
        if(!token){
            throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
        }
        const verification = await this._authService.resendVerification(phoneNumber, token);
        if(!verification){
            throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
        }
        const otpCode = UtilityService.generate4Digit();
        const smsData = {
            recipient: verification.phone,
            message: `Your verification code is ${otpCode}`,
            attributes: {
                datatype: 'string',
                value: 'transactional'
            }
        }
        const smsResult = await this._smsService.sendVerificationSMS(smsData);
        const otpSent = smsResult?.$metadata?.httpStatusCode === 200;
        if (!otpSent) {
            throw new AuthenticationError(ResponseMessage.VERIFICATION_FAILED);
        }
        return {
            message: `We have sent an otp to *** *** *** ${(verification.phone as string).slice(-2)}`,
            token: verification.reference,
            expiry: verification.expiry,
            phone: verification.phone
        }
    }

    async handleExpiredVerification(phoneNumber: string): Promise<any> {
        return await this._authService.handleExpiredVerification(phoneNumber);
    }

    // async oauth(data: any): Promise<any> {
    //     //handle the google auth with the 
    //    const {access_token} = await this._googleService.getAccessToken(data.code);
    //    const user = await this._googleService.getUserProfile(access_token);
       
    //    const provider = data.provider;
    //    switch (provider) {
    //        case OAuthProvider.GOOGLE:
    //            return this.handleGoogleOAuthUser(user);
    //        case OAuthProvider.FACEBOOK:
    //            return this.handleFacebookOAuthUser(user);
    //        case OAuthProvider.APPLE:
    //            return this.handleAppleOAuthUser(user);
    //        default:
    //            throw new AuthenticationError('Invalid OAuth provider');

    //     }
    // }

    async oauth(data: OAuthUserData): Promise<any> {
        const createUserDTO: CreateUserDTO = {
            email: data.email,
            first_name: data.name.split(' ')[0],
            last_name: data.name.split(' ')[1],
            phone: data.phone,
            password: "",
            roles: [],
            provider: data.provider,
            provider_id: data.id
        }
        const userResponse = await this._authService.oauth(createUserDTO);
        console.log({userResponse});
        return userResponse;
    }

    private async handleGoogleOAuthUser(userData: any): Promise<LoginResponseDTO | undefined> {
        const {access_token} = await this._googleService.getAccessToken(userData.code);
        const user = await this._googleService.getUserProfile(access_token);
        if (!user) {
            throw new AuthenticationError('Failed to get Google user profile');
        }
        
        // Create new user if not exists
        const newUser: CreateUserDTO = this.buildGoogleUser(userData);
        const userResponse = await this._authService.oauth(newUser);
        return userResponse;
    }
    private async handleFacebookOAuthUser(userData: any): Promise<LoginResponseDTO | undefined> {
        //TODO
        // Create new user if not exists
        const newUser: CreateUserDTO = this.buildFacebookUser(userData);
        const userResponse = await this._authService.oauth(newUser);
        return userResponse;
    }

    private async handleAppleOAuthUser(userData: any): Promise<LoginResponseDTO | undefined> {
        // Create new user if not exists
        const newUser: CreateUserDTO = this.buildAppleUser(userData);
        const userResponse = await this._authService.oauth(newUser);
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
        
        // Set admin role
        dto.roles = [UserRole.ADMIN];
        return await this._authService.createUser(dto) as UserResponseDTO;
    }

    async register(dto: RegisterUserDTO, user: IUser): Promise<UserResponseDTO> {
       if(!dto){
         throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
       }
       console.log("AccountUseCase::register -> ", {dto});
       
       const updateUserDTO: UpdateUserDTO = {
         first_name: dto.full_name.split(' ')[0],
         last_name: dto.full_name.split(' ').slice(1).join(' '),
         email: dto.email,
         ...(dto.dob && { dob: dto.dob }),
         ...(dto.address && { address: dto.address }),
         ...(dto.password && { password: dto.password })
       };
       
       const result = await this._authService.updateUser(user._id as string, updateUserDTO, user);
       return result as UserResponseDTO;
    }

    async login(phone: string, password: string): Promise<any> {
        console.log("Got here!!!", {phone}, {password});
        phone = phone.replace(/\s/g, '');

        // Validate inputs
        if (!phone || !password) {
            throw new ValidationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
        }

        return this._authService.authenticate(phone, password);
    }
    
    async updateProfile(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO> {
        if (!userId || !dto) {
            throw new ValidationError(ResponseMessage.INVALID_UPDATE_REQUEST);
        }

        const user = existingUser || await this._authService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        // Update user profile through auth service
        const updatedUser = await this._authService.updateUser(userId, dto, existingUser);
        return updatedUser as UserResponseDTO;
    }

    async getUserProfile(userId: string): Promise<UserResponseDTO> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        const user = await this._authService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        return user;
    }

    async verifyEmail(token: string): Promise<boolean> {
        if (!token) {
            throw new ValidationError(ResponseMessage.VERIFICATION_TOKEN_REQUIRED);
        }

        // Verify email token through auth service
        const isVerified = await this._authService.verifyEmailToken(token);
        return isVerified;
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }

        // Request password reset through auth service
        await this._authService.requestPasswordReset(email);
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        if (!token || !newPassword) {
            throw new ValidationError(ResponseMessage.TOKEN_PASSWORD_REQUIRED);
        }

        // Reset password through auth service
        return await this._authService.resetPassword(token, newPassword);
    }

    async refreshToken(refreshToken: string): Promise<{ token: string }> {
        // Get new access token using refresh token
        const result = await this._authService.refreshAccessToken(refreshToken);
        return { token: result.accessToken };
    }

    async refresh(user: IUser, token: string): Promise<{ user: UserResponseDTO; token: string }> {
        if (!user || !token) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }

        // Refresh token through auth service
        const result = await this._authService.refreshAccessToken(user._id as string);
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

        // Revoke refresh token through auth service
        await this._authService.revokeRefreshToken(userId);
    }

    async setupPassword(dto: SetupPasswordDTO): Promise<UserResponseDTO> {
        if (!dto) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }

        // Delegate to auth service
        const user = await this._authService.setupPassword(
            dto.international_phone,
            dto.password,
            dto.token
        );

       return user;
    }

    async decodeToken(token: string): Promise<any> {
        return await this._authService.verifyToken(token);
    }
}