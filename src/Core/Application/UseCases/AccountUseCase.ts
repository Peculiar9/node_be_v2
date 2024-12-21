import { inject, injectable } from 'inversify';
import { TYPES } from '../../Types/Constants';
import { IAccountUseCase } from '../Interface/UseCases/IAccountUseCase';
import { IAuthService } from '../Interface/Services/IAuthService';
import { ValidationError } from '../Error/AppError';
import { CreateUserDTO, UserResponseDTO, UpdateUserDTO } from '../DTOs/UserDTO';
import { UserRole } from '../Enums/UserRole';
import { ResponseMessage } from '../Response/ResponseFormat';
import { UserService } from '../../../Infrastructure/Services/UserService';

@injectable()
export class AccountUseCase implements IAccountUseCase {
    constructor(
        @inject(TYPES.AuthService) private authService: IAuthService,
        @inject(TYPES.UserService) private readonly userService: UserService 
    ) {}

    async getAllUsers(): Promise<UserResponseDTO[]> {
        // This should be admin-only operation
        return await this.userService.getAllUsers();
    }

    async createAdmin(dto: CreateUserDTO): Promise<UserResponseDTO> {
        if (!dto) {
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }
        
        // Set admin role
        dto.roles = [UserRole.ADMIN];
        return await this.authService.createUser(dto) as UserResponseDTO;
    }

    async register(dto: CreateUserDTO): Promise<UserResponseDTO> {
       if(!dto){
         throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
       }
       console.log("AccountUseCase::register -> ", {dto});
       dto.roles = [UserRole.ADMIN];
       const result = await this.authService.createUser(dto);
       return result as UserResponseDTO;
    }

    async login(email: string, password: string): Promise<any> {
        // Validate inputs
        if (!email || !password) {
            throw new ValidationError(ResponseMessage.EMAIL_PASSWORD_REQUIRED);
        }

        // Delegate authentication to AuthService
        return this.authService.authenticate(email, password);
    }
    
    async updateProfile(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
        if (!userId || !dto) {
            throw new ValidationError(ResponseMessage.INVALID_UPDATE_REQUEST);
        }

        const user = await this.authService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        // Update user profile through auth service
        const updatedUser = await this.authService.updateUser(userId, dto);
        return updatedUser as UserResponseDTO;
    }

    async getUserProfile(userId: string): Promise<UserResponseDTO> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        const user = await this.authService.getUserFromToken(userId);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        return user;
    }

    async verifyEmail(token: string): Promise<boolean> {
        if (!token) {
            throw new ValidationError(ResponseMessage.VERIFICATION_TOKEN_REQUIRED);
        }

        // Verify email token through auth service
        const isVerified = await this.authService.verifyEmailToken(token);
        return isVerified;
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }

        // Request password reset through auth service
        await this.authService.requestPasswordReset(email);
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        if (!token || !newPassword) {
            throw new ValidationError(ResponseMessage.TOKEN_PASSWORD_REQUIRED);
        }

        // Reset password through auth service
        return await this.authService.resetPassword(token, newPassword);
    }

    async refreshToken(userId: string): Promise<{ token: string }> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        // Get new access token using refresh token
        const result = await this.authService.refreshAccessToken(userId);
        return { token: result.accessToken };
    }

    async logout(userId: string): Promise<void> {
        if (!userId) {
            throw new ValidationError(ResponseMessage.USER_ID_REQUIRED_MESSAGE);
        }

        // Revoke refresh token through auth service
        await this.authService.revokeRefreshToken(userId);
    }
}