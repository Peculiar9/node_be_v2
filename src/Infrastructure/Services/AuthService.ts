import { inject, injectable } from 'inversify';
import { TYPES } from '../../Core/Types/Constants';
import { IAuthService } from '../../Core/Application/Interface/Services/IAuthService';
import { TransactionManager } from '../Repository/SQL/Abstractions/TransactionManager';
import {AuthenticationError, ConflictError, InternalServerError, ValidationError} from '../../Core/Application/Error/AppError';
import { LoginResponseDTO } from '../../Core/Application/DTOs/AuthDTO';
import { UtilityService } from '../../Core/Services/UtilityService';
import { DatabaseIsolationLevel } from '../../Core/Application/Enums/DatabaseIsolationLevel';
import * as jwt from 'jsonwebtoken';
import { IUser } from '../../Core/Application/Interface/Entities/auth-and-user/IUser';
import {CreateUserDTO, UserResponseDTO, UpdateUserDTO} from '../../Core/Application/DTOs/UserDTO';
import { UserRole } from '../../Core/Application/Enums/UserRole';
import { UserRepository } from '../Repository/SQL/users/UserRepository';
import {ResponseMessage} from "../../Core/Application/Response/ResponseFormat";
import {User} from "../../Core/Application/Entities/User";
import { TableNames } from '../../Core/Application/Enums/TableNames';
import * as bcrypt from 'bcrypt';

@injectable()
export class AuthService implements IAuthService {
    constructor(
        @inject(TYPES.TransactionManager) private transactionManager: TransactionManager,
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository
    ) {}
    
    async updateUser(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO | undefined> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            if (dto.email && dto.email !== user.email) {
                const existingUser = await this.userRepository.findByEmail(dto.email);
                if (existingUser) {
                    throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
                }
            }

            const updatedUser = await this.userRepository.update(userId, {
                ...dto,
                updated_at: new Date().toISOString(),
            });

            await this.transactionManager.commit();

            return this.constructUserObject(updatedUser);
        } catch (error) {
            await this.transactionManager.rollback();
            throw error;
        }
    }

    async getUserFromToken(token: string): Promise<UserResponseDTO> {
        try {
            const decoded = await this.verifyToken(token) as jwt.JwtPayload;

            if (!decoded.sub) {
                throw new AuthenticationError('Invalid token payload');
            }

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            return this.constructUserObject(user);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.FAILED_TOKEN_DESTRUCTURE);
        }
    }

    async authenticate(email: string, password: string): Promise<LoginResponseDTO | undefined> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            const user = await this.userRepository.findByEmail(email);
            console.log({user});
            if (!user) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            const isValidPassword = await UtilityService.verifyPassword(
                password,
                user.password as string
            );

            if (!isValidPassword) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            // Update last login timestamp
            await this.userRepository.update(user._id as string, {
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString(),
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

    async createUser(createUserDto: CreateUserDTO): Promise<UserResponseDTO | undefined> {
        console.log("After ensure table exists!!!");
        try {

            // Begin transaction
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });

            const userExistTable = await this.userRepository.ensureTableExists(User, TableNames.USERS);
            console.log({ userExistTable });
            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(createUserDto.email);
            console.log({ existingUser });
            if (existingUser) {
                throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
            }

            const hashedPasswordObj = await UtilityService.hashPassword(createUserDto.password);
            
            const userObj = await User.createFromDTO(createUserDto) as User;
            const newUser = await this.userRepository.create(userObj as IUser);
            
            await this.transactionManager.commit();

            return this.constructUserObject(newUser);
        } catch (error: any) {
            await this.transactionManager.rollback();
            if (error instanceof ConflictError) {
                throw error;
            }
            console.error('UserCreate Error :', {
                message: error.message,
                stack: error.stack
            });
            throw new InternalServerError(ResponseMessage.USER_CREATION_FAILED);
        }
    }

    //TODO: Move this to the DTO layer for mapping. 
    private constructUserObject(user: IUser): UserResponseDTO {
        return {
            id: user._id as string,
            first_name: user.first_name as string,
            last_name: user.last_name as string,
            email: user.email as string,
            profile_image: user.profile_image as string,
            roles: user.roles as UserRole[],
            status: user.status as string,
            is_active: user.is_active,
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
            throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;

            if (decoded.type !== 'refresh') {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_TYPE_MESSAGE);
            }

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            const isValidRefreshToken = await UtilityService.verifyTokenHash(
                refreshToken,
                user.refresh_token
            );

            if (!isValidRefreshToken) {
                throw new AuthenticationError(ResponseMessage.INVALID__REFRESH_TOKEN_MESSAGE);
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
            throw new AuthenticationError(ResponseMessage.INVALID__REFRESH_TOKEN_MESSAGE);
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

    async verifyEmailToken(token: string): Promise<boolean> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            const user = await this.userRepository.findById(decoded.userId);
            
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            await this.userRepository.update(user.id, { email_verified: true });
            return true;
        } catch (error) {
            throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }

        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        // Save reset token hash
        const resetTokenHash = await bcrypt.hash(resetToken, 10);
        console.log({ resetTokenHash });
        await this.userRepository.update(user._id as string, { reset_token: resetTokenHash });

        // TODO: Send email with reset token
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            const user = await this.userRepository.findById(decoded.userId);

            if (!user || !user.resetTokenHash) {
                throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);
            await this.userRepository.update(user.id, { 
                password: passwordHash,
                reset_token: null 
            });

            return true;
        } catch (error) {
            throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }
}
