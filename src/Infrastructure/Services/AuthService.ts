import { inject, injectable } from 'inversify';
import { TYPES } from '../../Core/Types/Constants';
import { IAuthService } from '../../Core/Application/Interface/Services/IAuthService';
import { TransactionManager } from '../Repository/SQL/Abstractions/TransactionManager';
import { AuthenticationError } from '../../Core/Application/Error/AppError';
import { LoginResponseDTO } from '../../Core/Application/DTOs/AuthDTO';
import { UtilityService } from '../../Core/Services/UtilityService';
import { DatabaseIsolationLevel } from '../../Core/Application/Enums/DatabaseIsolationLevel';
import * as jwt from 'jsonwebtoken';
import { IUser } from '@/Core/Application/Interface/Entities/auth-and-user/IUser';
import { UserResponseDTO } from '@/Core/Application/DTOs/UserDTO';
import { UserRole } from '@/Core/Application/Enums/UserRole';
import { UserRepository } from '../Repository/SQL/users/UserRepository';

@injectable()
export class AuthService implements IAuthService {
    constructor(
        @inject(TYPES.TransactionManager) private transactionManager: TransactionManager,
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository
    ) {}

    async getUserFromToken(token: string): Promise<UserResponseDTO> {
        try {
            const decoded = await this.verifyToken(token) as jwt.JwtPayload;

            if (!decoded.sub) {
                throw new AuthenticationError('Invalid token payload');
            }

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                throw new AuthenticationError('User not found');
            }

            return this.constructUserObject(user);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError('Failed to get user from token');
        }
    }

    async authenticate(email: string, password: string): Promise<LoginResponseDTO> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new AuthenticationError('Invalid credentials');
            }

            const isValidPassword = await UtilityService.verifyPassword(
                password,
                user.password as string
            );

            if (!isValidPassword) {
                throw new AuthenticationError('Invalid credentials');
            }

            // Update last login timestamp
            await this.userRepository.update(user._id as string, {
                last_login: new Date().toISOString(),
            });

            // Generate both access and refresh tokens
            const { accessToken, refreshToken } = await this.generateTokens(user);

            // Store refresh token hash in database
            await this.userRepository.update(user._id as string, {
                refresh_token: await UtilityService.hashToken(refreshToken),
            });

            await this.transactionManager.commit();

            return {
                accessToken,
                refreshToken,
                user: this.constructUserObject(user),
            };
        } catch (error) {
            await this.transactionManager.rollback();
            throw error;
        }
    }

    private constructUserObject(user: IUser): UserResponseDTO {
        return {
            id: user._id as string,
            first_name: user.first_name as string,
            last_name: user.last_name as string,
            email: user.email as string,
            profile_image: user.profile_image as string,
            roles: user.roles as UserRole[],
            status: user.status as string,
            isActive: user.isActive,
            created_at: user.created_at as string,
            updated_at: user.updated_at as string,
        };
    }

    private async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = {
            sub: user._id,
            email: user.email,
            roles: user.roles,
            type: 'access',
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET!,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
                jwtid: UtilityService.generateUUID(),
            }
        );

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            process.env.JWT_REFRESH_SECRET!,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
                jwtid: UtilityService.generateUUID(),
            }
        );

        return { accessToken, refreshToken };
    }

    async verifyToken(token: string): Promise<any> {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
        } catch (error) {
            throw new AuthenticationError('Invalid token');
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;

            if (decoded.type !== 'refresh') {
                throw new AuthenticationError('Invalid token type');
            }

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                throw new AuthenticationError('User not found');
            }

            const isValidRefreshToken = await UtilityService.verifyTokenHash(
                refreshToken,
                user.refresh_token
            );

            if (!isValidRefreshToken) {
                throw new AuthenticationError('Invalid refresh token');
            }

            const payload = {
                sub: user._id,
                email: user.email,
                roles: user.roles,
                type: 'access',
            };

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_ACCESS_SECRET!,
                {
                    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
                    jwtid: UtilityService.generateUUID(),
                }
            );

            return { accessToken };
        } catch (error) {
            throw new AuthenticationError('Invalid refresh token');
        }
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            await this.userRepository.update(userId, {
                refresh_token: null,
            });

            await this.transactionManager.commit();
        } catch (error) {
            await this.transactionManager.rollback();
            throw error;
        }
    }
}
