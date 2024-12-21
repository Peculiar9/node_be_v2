import { CreateUserDTO, UserResponseDTO, UpdateUserDTO } from '../../DTOs/UserDTO';
import { LoginResponseDTO } from '../../DTOs/AuthDTO';

export interface IAuthService {
    createUser(dto: CreateUserDTO): Promise<UserResponseDTO| undefined>;
    authenticate(email: string, password: string): Promise<LoginResponseDTO | undefined>;
    getUserFromToken(userId: string): Promise<UserResponseDTO | undefined>;
    updateUser(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO | undefined>;
    verifyEmailToken(token: string): Promise<boolean>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<boolean>;
    refreshAccessToken(userId: string): Promise<{ accessToken: string }>;
    revokeRefreshToken(userId: string): Promise<void>;
    verifyToken(token: string): Promise<any>;
}