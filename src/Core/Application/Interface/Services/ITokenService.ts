import { IUser } from '../Entities/auth-and-user/IUser';

/**
 * Interface for token-related operations
 * Responsible for generating and verifying authentication tokens
 */
export interface ITokenService {
    /**
     * Generates JWT access and refresh tokens for a user
     * @param user User entity
     * @returns Object containing accessToken and refreshToken
     */
    generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }>;
    
    /**
     * Verifies a JWT token
     * @param token JWT token to verify
     * @returns Decoded token payload if valid
     * @throws AuthenticationError if token is invalid or expired
     */
    verifyToken(token: string): Promise<any>;
    
    /**
     * Generates a password reset token
     * @param userId User ID
     * @returns Reset token
     */
    generatePasswordResetToken(userId: string): Promise<string>;
    
    /**
     * Verifies a password reset token
     * @param token Reset token
     * @param hashedToken Hashed token stored in the database
     * @returns True if token is valid
     */
    verifyPasswordResetToken(token: string, hashedToken: string): Promise<boolean>;

    // generateOAuthToken(): Promise<string>;
}
