import { LoginResponseDTO } from '../../DTOs/AuthDTO';
import { CreateUserDTO } from '../../DTOs/UserDTO';

export interface IAuthService {
    authenticate(email: string, password: string): Promise<LoginResponseDTO>;
    verifyToken(token: string): Promise<any>;
    refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>;
    revokeRefreshToken(userId: string): Promise<void>;
    getUserFromToken(userId: string): Promise<any>;
    createUser(createUserDto: CreateUserDTO): Promise<any>;
}