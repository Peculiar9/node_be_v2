import { UserResponseDTO } from './UserDTO';

export interface LoginResponseDTO {
    accessToken: string;
    refreshToken: string;
    user: Partial<UserResponseDTO>;
}