import { inject, injectable } from 'inversify';
import { TYPES } from '../../Types/Constants';
import { IAccountUseCase } from '../Interface/UseCases/IAccountUseCase';
import { VerifyEmailDTO, IEmailVerificationResponse } from '../DTOs/AuthDTO';
import { UserResponseDTO, UpdateUserDTO, CreateUserDTO, UserProfileResponseDTO } from '../DTOs/UserDTO';
import { ResponseMessage } from '../Response/ResponseFormat';
import { LoginResponseDTO } from '../DTOs/AuthDTO';
import { IUser } from '../Interface/Entities/auth-and-user/IUser';
import { AppError, ValidationError, UnprocessableEntityError, ServiceError } from '../Error/AppError';
import { Console } from '@Infrastructure/Utils/Console';
import { IRegistrationService } from '../Interface/Services/IRegistrationService';
import { IUserProfileService } from '../Interface/Services/IUserProfileService';

@injectable()
export class AccountUseCase implements IAccountUseCase {
    constructor(
        @inject(TYPES.RegistrationService) private readonly _registrationService: IRegistrationService,
        @inject(TYPES.UserProfileService) private readonly _userProfileService: IUserProfileService,
    ) { }

    async updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO> {
        return await this._userProfileService.updateProfileImage(image, user);
    }

    async resendEmailVerification(email: string, reference: string): Promise<IEmailVerificationResponse> {
        return await this._registrationService.resendVerification(email, reference);
    }

    async removeUser(email: string): Promise<UserResponseDTO | undefined> {
        return await this._userProfileService.removeUser(email);
    }

    async verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO> {
        try {
            Console.info("AccountUseCase::verifyEmailCode -> Verifying email code", { data });

            if (!data || !data.email || !data.code || !data.reference) {
                throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
            }

            const result = await this._registrationService.verifyEmailCode(data);
            return result;
        } catch (error: any) {
            Console.error(error, { message: 'Failed to verify email code' });
            if (error instanceof ValidationError || error instanceof UnprocessableEntityError) {
                throw error;
            }
            throw new ServiceError(ResponseMessage.EMAIL_VERIFICATION_FAILED);
        }
    }

    async createAdmin(dto: CreateUserDTO): Promise<UserResponseDTO> {
        if (!dto) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }
        // dto.roles = [UserRole.OPERATOR]; // Assuming caller handles role assignment or we do it here
        return await this._registrationService.createUser(dto);
    }

    async updateProfile(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO> {
        if (!userId || !dto) {
            throw new ValidationError(ResponseMessage.INVALID_UPDATE_REQUEST);
        }

        const user = existingUser || await this._userProfileService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        const updatedUser = await this._userProfileService.updateUser(userId, dto, existingUser);
        return updatedUser as UserResponseDTO;
    }

    async getUserProfile(userId: string): Promise<UserResponseDTO> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        const user = await this._userProfileService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        return user;
    }

}