import { IAuthUseCase } from "../Interface/UseCases/IAuthUseCase";
import { RegisterUserDTOV2 } from "../DTOs/AuthDTOV2";
import { IEmailVerificationResponse, RefreshTokenDTO, VerifyEmailDTO } from "../DTOs/AuthDTO";
import { LoginDTO } from "../DTOs/AuthDTO";
import { TYPES } from "../../Types/Constants";
import { inject } from "inversify";
import { IRegistrationService } from "../Interface/Services/IRegistrationService";
import { UserResponseDTO } from "../DTOs/UserDTO";
import { IUser } from "../Interface/Entities/auth-and-user/IUser";
import { IUserProfileService } from "../Interface/Services/IUserProfileService";
import { IAuthenticationService } from "../Interface/Services/IAuthenticationService";
import { AuthHelpers } from "../../../Infrastructure/Services/helpers/AuthHelpers";
export class AuthUseCase implements IAuthUseCase {
    constructor(
        @inject(TYPES.RegistrationService) private readonly _registrationService: IRegistrationService,
        @inject(TYPES.UserProfileService) private readonly _userProfileService: IUserProfileService,
        @inject(TYPES.AuthenticationService) private readonly _authenticationService: IAuthenticationService,
        @inject(TYPES.AuthHelpers) private readonly _authHelpers: AuthHelpers,
    ) {}
    
    async register(dto: RegisterUserDTOV2): Promise<UserResponseDTO> {
        console.log('AuthUseCase::register -> ', dto);
        const result = await this._registrationService.initRegistration(dto);
        return result;
    }
    
    async verifyEmail(dto: VerifyEmailDTO): Promise<{accessToken: string, refreshToken: string, user: UserResponseDTO}> {
        console.log('AuthUseCase::verifyEmail -> ', dto);
        const response = await this._registrationService.verifyEmail(dto.reference, dto.code, dto.email);
        return response;
    }
    
    async resendEmailVerification(dto: VerifyEmailDTO): Promise<IEmailVerificationResponse> {
        console.log('AuthUseCase::resendEmailVerification -> ', dto);
        const response = await this._registrationService.resendEmailVerification(dto.reference, dto.email);
        return response;
    }
    
    
    async refresh(dto: RefreshTokenDTO): Promise<{ accessToken: string; refreshToken: string; user: UserResponseDTO; }> {
        console.log('AuthUseCase::refresh -> ', dto);
        const response = await this._authenticationService.refreshAccessToken(dto.refresh_token);
        const user = this._authHelpers.constructUserObject(response.user);
        return { accessToken: response.accessToken, refreshToken: response.refreshToken, user };
    }
    
    async login(dto: LoginDTO): Promise<{accessToken: string, refreshToken: string, user: UserResponseDTO}> {
        console.log('AuthUseCase::login -> ', dto);
        
        return {} as {accessToken: string, refreshToken: string, user: UserResponseDTO};
    }

    async updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO>{
        console.log('AuthUseCase::updateProfileImage -> ', image);
        return await this._userProfileService.updateProfileImage(image, user);
    }

    async logout(): Promise<UserResponseDTO>{
        console.log('AuthUseCase::logout -> ');
        
        return {} as UserResponseDTO;
    }
}