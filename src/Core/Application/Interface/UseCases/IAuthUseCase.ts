// Authentication use cases interface

import { IUser } from "../Entities/auth-and-user/IUser";
import { RegisterUserDTOV2 } from "../../DTOs/AuthDTOV2";
import { IEmailVerificationResponse, VerifyEmailDTO } from "../../DTOs/AuthDTO";
import { LoginDTO } from "../../DTOs/AuthDTO";
import { UserResponseDTO } from "../../DTOs/UserDTO";
import { RefreshTokenDTO } from "../../DTOs/AuthDTO";

export interface IAuthUseCase {
    register(dto: RegisterUserDTOV2): Promise<UserResponseDTO>;
    verifyEmail(dto: VerifyEmailDTO): Promise<{accessToken: string, refreshToken: string, user: UserResponseDTO}>;
    resendEmailVerification(dto: VerifyEmailDTO): Promise<IEmailVerificationResponse>;
    updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO>;
    refresh(dto: RefreshTokenDTO): Promise<{accessToken: string, refreshToken: string, user: UserResponseDTO}>;
    login(dto: LoginDTO): Promise<{accessToken: string, refreshToken: string, user: UserResponseDTO}>;
    logout(): Promise<UserResponseDTO>;
}
