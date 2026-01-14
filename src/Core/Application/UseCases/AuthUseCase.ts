import { IAuthUseCase } from "../Interface/UseCases/IAuthUseCase";
import { UserRegistrationDTO } from "../DTOs/AuthDTOV2";
import { ChangePasswordDTO, ForgotPasswordDTO, IEmailVerificationResponse, LoginResponseDTO, RefreshTokenDTO, ResetPasswordDTO, VerifyEmailDTO } from "../DTOs/AuthDTO";
import { LoginDTO } from "../DTOs/AuthDTO";
import { TYPES } from "../../Types/Constants";
import { inject } from "inversify";
import { IRegistrationService } from "../Interface/Services/IRegistrationService";
import { UserResponseDTO } from "../DTOs/UserDTO";
import { IUser } from "../Interface/Entities/auth-and-user/IUser";
import { IUserProfileService } from "../Interface/Services/IUserProfileService";
import { IAuthenticationService } from "../Interface/Services/IAuthenticationService";
import { AuthHelpers } from "@Infrastructure/Services/helpers/AuthHelpers";
import { ITwilioEmailService } from "../Interface/Services/ITwilioEmailService";
import { ValidationError, ServiceError } from "../Error/AppError";
import { UserStatus } from "../Enums/UserStatus";
import { Console } from "console";
import { UtilityService } from "@Core/Services/UtilityService";

export class AuthUseCase implements IAuthUseCase {
    constructor(
        @inject(TYPES.RegistrationService) private readonly _registrationService: IRegistrationService,
        @inject(TYPES.UserProfileService) private readonly _userProfileService: IUserProfileService,
        @inject(TYPES.AuthenticationService) private readonly _authenticationService: IAuthenticationService,
        @inject(TYPES.AuthHelpers) private readonly _authHelpers: AuthHelpers,
        @inject(TYPES.TwilioEmailService) private readonly _twilioEmailService: ITwilioEmailService,
    ) { }

    forgotPassword(dto: ForgotPasswordDTO): Promise<{ message: string; email: string; }> {
        throw new Error("Method not implemented.");
    }
    resetPassword(dto: ResetPasswordDTO): Promise<{ message: string; }> {
        throw new Error("Method not implemented.");
    }
    changePassword(dto: ChangePasswordDTO, user: IUser): Promise<{ message: string; }> {
        throw new Error("Method not implemented.");
    }
    getCurrentUser(user: IUser): Promise<UserResponseDTO> {
        return Promise.resolve(this._authHelpers.constructUserObject(user));
    }

    async register(dto: UserRegistrationDTO): Promise<UserResponseDTO> {
        const result = await this._registrationService.initRegistration(dto);
        return result;
    }

    async verifyEmail(dto: VerifyEmailDTO): Promise<{ accessToken: string, refreshToken: string, user: UserResponseDTO }> {
        const response = await this._registrationService.verifyEmailCode(dto);
        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user as UserResponseDTO
        };
    }

    async resendEmailVerification(dto: VerifyEmailDTO): Promise<IEmailVerificationResponse> {
        const response = await this._registrationService.resendVerification(dto.email, dto.reference);
        return response;
    }

    async refresh(dto: RefreshTokenDTO): Promise<{ accessToken: string; refreshToken: string; user: UserResponseDTO; }> {
        const response = await this._authenticationService.refreshAccessToken(dto.refresh_token);
        const user = this._authHelpers.constructUserObject(response.user);
        return { accessToken: response.accessToken, refreshToken: response.refreshToken, user };
    }

    async login(dto: LoginDTO): Promise<{ accessToken: string; refreshToken: string; user: Partial<UserResponseDTO>; }> {

        const response = await this._authenticationService.authenticate(dto.identifier, dto.password);

        if (!response) {
            throw new Error('Authentication failed');
        }
        return { accessToken: response.accessToken, refreshToken: response.refreshToken, user: response.user };
    }

    async updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO> {
        return await this._userProfileService.updateProfileImage(image, user);
    }

    async logout(): Promise<UserResponseDTO> {
        return {} as UserResponseDTO;
    }
}