import { UserResponseDTO } from './UserDTO';

/**
 * DTO for refresh token result
 */
export class RefreshTokenResultDTO {
    user: any; // IUser entity - will be mapped to UserResponseDTO in controller
    accessToken: string;
    refreshToken: string;
}

/**
 * DTO for token pair
 */
export class TokenPairDTO {
    accessToken: string;
    refreshToken: string;
}

/**
 * DTO for login result
 */
export class LoginResultDTO {
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
    message: string;
}
