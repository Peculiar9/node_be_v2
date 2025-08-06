import { injectable } from "inversify";
import { ITokenService } from "../../Core/Application/Interface/Services/ITokenService";
import { IUser } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import * as jwt from "jsonwebtoken";
import { UtilityService } from "../../Core/Services/UtilityService";
import { AuthenticationError } from "../../Core/Application/Error/AppError";
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";
import * as bcrypt from "bcryptjs";
import { Console, LogLevel } from "../Utils/Console";

/**
 * Service for handling JWT token generation and verification
 * Centralizes all token-related operations to avoid duplication
 */
@injectable()
export class TokenService implements ITokenService {
    /**
     * Generates JWT access and refresh tokens for a user
     * @param user User entity
     * @returns Object containing accessToken and refreshToken
     */
    public async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = {
            sub: user._id,
            email: user.email,
            roles: user.roles,
            type: 'access',
        };

        const accessSecret = process.env.JWT_ACCESS_SECRET!;
        if (!accessSecret) {
            Console.error(new Error("JWT_ACCESS_SECRET not defined"), {
                message: "JWT access secret is not defined in environment variables",
                level: LogLevel.ERROR
            });
            throw new Error("Token generation failed due to missing configuration");
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET!;
        if (!refreshSecret) {
            Console.error(new Error("JWT_REFRESH_SECRET not defined"), {
                message: "JWT refresh secret is not defined in environment variables",
                level: LogLevel.ERROR
            });
            throw new Error("Token generation failed due to missing configuration");
        }

        const accessToken = jwt.sign(
            payload,
            accessSecret,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
                jwtid: UtilityService.generateUUID(),
            }
        );

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            refreshSecret,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
                jwtid: UtilityService.generateUUID(),
            }
        );

        return { accessToken, refreshToken };
    }

    // public async generateOAuthToken(): Promise<string> {
    //     try {
    //         const payload = {
    //             sub: 'oauth',
    //             type: 'access',
    //         };

    //         const secret = process.env.JWT_ACCESS_SECRET!;
    //         console.log("JWT_ACCESS_SECRET: ", secret)
    //         if (!secret) {
    //             Console.error(new Error("JWT_ACCESS_SECRET not defined"), {
    //                 message: "JWT access secret is not defined in environment variables",
    //                 level: LogLevel.ERROR
    //             });
    //             throw new Error("Token generation failed due to missing configuration");
    //         }

    //         const accessToken = jwt.sign(
    //             payload,
    //             secret,
    //             {
    //                 expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    //                 jwtid: UtilityService.generateUUID(),
    //             }
    //         );

    //         return accessToken;
    //     } catch (error: any) {
    //         Console.error(error, {
    //             message: `Token generation error: ${error.message}`,
    //             level: LogLevel.ERROR
    //         });
    //         throw error;
    //     }
    // }

    // public async verifyOAuthToken(token: string): Promise<any> {
    //     try {
    //         const secret = process.env.JWT_ACCESS_SECRET;
    //         console.log("JWT_ACCESS_SECRET: ", secret)
    //         if (!secret) {
    //             Console.error(new Error("JWT_ACCESS_SECRET not defined"), {
    //                 message: "JWT access secret is not defined in environment variables",
    //                 level: LogLevel.ERROR
    //             });
    //             throw new Error("Token verification failed due to missing configuration");
    //         }

    //         const decoded = jwt.verify(token, secret);
    //         if(JSON.parse(JSON.stringify(decoded)).type !== 'access') {
    //             throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
    //         }
    //         if (!decoded) {
    //             throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
    //         }

    //         return decoded;
    //     } catch (error: any) {
    //         Console.error(error, {
    //             message: `Token verification error: ${error.message}`,
    //             level: LogLevel.ERROR
    //         });
            
    //         if (error.name === 'TokenExpiredError') {
    //             throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
    //         }
            
    //         throw new AuthenticationError(error.message);
    //     }
    // }
    /**
     * Verifies a JWT token
     * @param token JWT token to verify
     * @returns Decoded token payload if valid
     * @throws AuthenticationError if token is invalid or expired
     */
    public async verifyToken(token: string): Promise<any> {
        try {
            const secret = process.env.JWT_ACCESS_SECRET;
            // console.log("JWT_ACCESS_SECRET: ", secret);
            
            // Debug: Log token parts and secret characteristics
            // console.log("Secret length:", secret?.length);
            // console.log("Secret char codes:", secret?.split('').map(c => c.charCodeAt(0)));
            
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                try {
                    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
                    // console.log("Token header:", header);
                    // console.log("Token algorithm:", header.alg);
                    
                    // Try to decode without verification to see payload
                    const decodedPayload = jwt.decode(token);
                    // console.log("Decoded payload (without verification):", decodedPayload);
                } catch (e) {
                    console.log("Could not parse token parts for debugging:", e);
                }
            } else {
                console.log("Token does not have the expected format (header.payload.signature). Parts:", tokenParts.length);
            }
            
            if (!secret) {
                Console.error(new Error("JWT_ACCESS_SECRET not defined"), {
                    message: "JWT access secret is not defined in environment variables",
                    level: LogLevel.ERROR
                });
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            const decoded = jwt.verify(token, secret);
            
            if (!decoded) {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            return decoded;
        } catch (error: any) {
            Console.error(error, {
                message: `Token verification error: ${error.message}`,
                level: LogLevel.ERROR
            });
            
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }
            
            throw new AuthenticationError(error.message);
        }
    }

    /**
     * Generates a password reset token
     * @param userId User ID
     * @returns Reset token
     */
    public async generatePasswordResetToken(userId: string): Promise<string> {
        const payload = {
            sub: userId,
            purpose: 'password_reset',
            jti: UtilityService.generateUUID()
        };

        const secret = process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET!;
        if (!secret) {
            Console.error(new Error("JWT secret not defined"), {
                message: "JWT secret is not defined in environment variables",
                level: LogLevel.ERROR
            });
            throw new Error("Token generation failed due to missing configuration");
        }

        // Password reset tokens typically have a shorter expiration
        return jwt.sign(payload, secret, {
            expiresIn: process.env.JWT_RESET_EXPIRATION || '1h'
        });
    }

    /**
     * Verifies a password reset token against a hashed token
     * @param token Plain text token to verify
     * @param hashedToken Hashed token stored in the database
     * @returns True if token is valid
     */
    public async verifyPasswordResetToken(token: string, hashedToken: string): Promise<boolean> {
        try {
            // Compare the plain token with the hashed version stored in the database
            return await bcrypt.compare(token, hashedToken);
        } catch (error: any) {
            Console.error(error, {
                message: `Password reset token verification error: ${error.message}`,
                level: LogLevel.ERROR
            });
            return false;
        }
    }
}
