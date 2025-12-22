import { injectable, inject } from "inversify";
import { TYPES } from "../../Core/Types/Constants";
import { IUserProfileService } from "../../Core/Application/Interface/Services/IUserProfileService";
import { UserResponseDTO, UpdateUserDTO } from "../../Core/Application/DTOs/UserDTO";
import { IUser } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { UserRepository } from "../Repository/SQL/users/UserRepository";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { Console, LogLevel } from "../Utils/Console";
import { AppError, ValidationError } from "../../Core/Application/Error/AppError";
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";
import { FileService } from "./FileService";
import { UserStatus } from "../../Core/Application/Enums/UserStatus";
import { BaseService } from "./base/BaseService";
import { AuthHelpers } from "./helpers/AuthHelpers";
import { TokenService } from "./TokenService";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";

@injectable()
export class UserProfileService extends BaseService implements IUserProfileService {
    constructor(
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
        @inject(TYPES.AuthHelpers) private readonly authHelpers: AuthHelpers,
        @inject(TYPES.TokenService) private readonly tokenService: TokenService,
        @inject(TYPES.FileService) private readonly fileService: FileService,
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository
    ) {
        super(transactionManager);
    }

    async updateUser(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO | undefined> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();
            const user = existingUser || await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            if (dto.email && dto.email !== user.email) {
                await this.authHelpers.ensureUserDoesNotExistByEmail(dto.email);
            }
            if (dto.phone && dto.phone !== user.phone) {
                await this.authHelpers.ensureUserDoesNotExistByPhone(dto.phone);
            }

            // Update user
            const updatedUser = await this.userRepository.update(userId, {
                first_name: dto.first_name,
                last_name: dto.last_name,
                dob: dto.dob,
                gender: dto.gender,
                international_phone: dto.international_phone,
                country_code: dto.country_code,
                phone: dto.phone,
                // location: dto.location,
                password: dto.password
            });

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }

            return this.authHelpers.constructUserObject(updatedUser);
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error updating user, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.INTERNAL_SERVER_ERROR_MESSAGE);
        }
    }

    async getUserFromToken(userId: string): Promise<UserResponseDTO | undefined> {
        try {
            // Find user by ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            return this.authHelpers.constructUserObject(user);
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.INTERNAL_SERVER_ERROR_MESSAGE);
        }
    }

    async updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            // Ensure user exists
            if (!user || !user._id) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            // Upload image to file service
            const uploadResult = await this.fileService.uploadFile(user._id as string, image);
            if (!uploadResult || !uploadResult.file_url) {
                throw new ValidationError("Failed to upload profile image");
            }

            // Update user with new profile image URL
            const updatedUser = await this.userRepository.update(user._id as string, {
                profile_image: uploadResult.file_url
            });

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }

            return this.authHelpers.constructUserObject(updatedUser);
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error updating profile image, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.PROFILE_IMAGE_UPDATE_FAILED);
        }
    }

    async removeUser(email: string): Promise<UserResponseDTO | undefined> {
        let transactionSuccessfullyStarted = false;
        try {
            transactionSuccessfullyStarted = await this.beginTransaction();

            // Find user by email
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            // Soft delete user by marking as inactive
            const updatedUser = await this.userRepository.update(user._id as string, {
                is_active: false,
                status: UserStatus.DELETED,
                updated_at: new Date().toISOString()
            });

            if (transactionSuccessfullyStarted) {
                await this.commitTransaction();
            }

            return this.authHelpers.constructUserObject(updatedUser);
        } catch (error: any) {
            if (transactionSuccessfullyStarted) {
                Console.error(error, {
                    message: `Error removing user, rolling back transaction: ${error.message}`,
                    level: LogLevel.ERROR
                });
                await this.rollbackTransaction();
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError("User could not be removed from the user records");
        }
    }
    
    /**
     * Gets a user by ID
     * @param userId User ID
     * @returns User response DTO or undefined if not found
     */
    async getUserById(userId: string): Promise<UserResponseDTO | undefined> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }
            
            return this.authHelpers.constructUserObject(user);
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.INTERNAL_SERVER_ERROR_MESSAGE);
        }
    }
    
    /**
     * Gets a user by email
     * @param email User email
     * @returns User response DTO or undefined if not found
     */
    async getUserByEmail(email: string): Promise<UserResponseDTO | undefined> {
        try {
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }
            
            return this.authHelpers.constructUserObject(user);
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new ValidationError(ResponseMessage.INTERNAL_SERVER_ERROR_MESSAGE);
        }
    }
}
